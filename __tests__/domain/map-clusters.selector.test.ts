/**
 * Unit tests for the F2.5 supercluster wrapper (docs/roadmap.md): incidents
 * close together should collapse into one cluster point at a wide-area zoom,
 * distant incidents should stay separate, and a cluster should report an
 * expansion zoom that actually zooms in further.
 */
import { describe, it, expect } from 'vitest';
import {
  buildClusterIndex,
  getClusterLayer,
  getClusterExpansionZoom,
  type MapBounds,
} from '@/domain/selectors/map-clusters.selector';
import type { Incident } from '@/domain/models';

const WORLD_BOUNDS: MapBounds = [-180, -85, 180, 85];

function makeIncident(overrides: Partial<Incident>): Incident {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    sequenceId: '0001',
    order: 1,
    title: 'Incidencia de prueba',
    description: '',
    type: { id: 't1', key: 'plumbing', name: 'Hidrosanitario', name_en: 'Plumbing' },
    priority: 'medium',
    status: 'open',
    approval: 'pending',
    project: { id: 'p1', name: 'Proyecto Demo' },
    owner: { id: 'u1', name: 'Ana Gómez', email: 'ana@example.com' },
    assignees: [],
    observers: [],
    coordinates: { lat: 4.71, lng: -74.07 },
    locationDescription: null,
    dueDate: null,
    closingDate: null,
    media: [],
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Three incidents a few meters apart in Bogotá, plus one across the world in Tokyo.
const BOGOTA_CLUSTER: Incident[] = [
  makeIncident({ id: 'bog-1', coordinates: { lat: 4.71, lng: -74.07 } }),
  makeIncident({ id: 'bog-2', coordinates: { lat: 4.7101, lng: -74.0701 } }),
  makeIncident({ id: 'bog-3', coordinates: { lat: 4.7099, lng: -74.0699 } }),
];
const TOKYO_POINT = makeIncident({ id: 'tokyo-1', coordinates: { lat: 35.68, lng: 139.69 } });

describe('map-clusters.selector', () => {
  it('ignora incidencias sin coordenadas al construir el índice', () => {
    const index = buildClusterIndex([...BOGOTA_CLUSTER, makeIncident({ coordinates: null })]);
    const layer = getClusterLayer(index, WORLD_BOUNDS, 2);
    const totalIncidents = layer.reduce((sum, p) => sum + (p.type === 'cluster' ? p.count : 1), 0);
    expect(totalIncidents).toBe(BOGOTA_CLUSTER.length);
  });

  it('agrupa incidencias cercanas en un único punto de clúster a zoom de área amplia', () => {
    const index = buildClusterIndex([...BOGOTA_CLUSTER, TOKYO_POINT]);
    const layer = getClusterLayer(index, WORLD_BOUNDS, 2);

    // Bogotá collapses into one cluster; Tokyo stays a separate incident point.
    expect(layer).toHaveLength(2);
    const cluster = layer.find((p) => p.type === 'cluster');
    const lone = layer.find((p) => p.type === 'incident');
    expect(cluster).toMatchObject({ type: 'cluster', count: 3 });
    expect(lone).toMatchObject({ type: 'incident', incidentId: 'tokyo-1' });
  });

  it('a zoom máximo cada incidencia se renderiza como punto individual', () => {
    const index = buildClusterIndex(BOGOTA_CLUSTER);
    // Bounds tight around the cluster, zoom high enough that supercluster's
    // maxZoom (16) kicks in and stops merging points.
    const bounds: MapBounds = [-74.08, 4.7, -74.06, 4.72];
    const layer = getClusterLayer(index, bounds, 20);

    expect(layer.filter((p) => p.type === 'incident')).toHaveLength(3);
    expect(layer.some((p) => p.type === 'cluster')).toBe(false);
  });

  it('getClusterExpansionZoom devuelve un zoom mayor al que formó el clúster', () => {
    const index = buildClusterIndex(BOGOTA_CLUSTER);
    const layer = getClusterLayer(index, WORLD_BOUNDS, 2);
    const cluster = layer.find((p) => p.type === 'cluster');
    if (!cluster || cluster.type !== 'cluster') throw new Error('expected a cluster point');

    const expansionZoom = getClusterExpansionZoom(index, cluster.clusterId);
    expect(expansionZoom).toBeGreaterThan(2);
  });
});
