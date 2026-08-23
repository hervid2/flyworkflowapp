/**
 * Wraps `supercluster` (installed but previously unused — see docs/roadmap.md
 * F2.5) to turn geolocated incidents into a clustered point layer. Kept
 * framework-agnostic and pure so it's testable without a live Mapbox instance;
 * MapboxViewer only has to feed it bounds/zoom and render what comes back.
 */
import Supercluster, { type ClusterFeature, type PointFeature } from 'supercluster';
import type { Incident } from '../models';

/** Properties carried on each leaf point fed into the cluster index. */
interface IncidentPointProps {
  incidentId: string;
}

// Both type params must be given explicitly — Supercluster's cluster-props
// generic (C) defaults to AnyProps, not P, if only P is specified.
export type IncidentClusterIndex = Supercluster<IncidentPointProps, IncidentPointProps>;

/** `[west, south, east, north]`, the shape Mapbox's `getBounds()` reduces to. */
export type MapBounds = [number, number, number, number];

/** A rendered cluster: many incidents collapsed into one point at this zoom. */
export interface ClusterPoint {
  type: 'cluster';
  clusterId: number;
  lng: number;
  lat: number;
  count: number;
}

/** A rendered single incident: below the cluster radius at this zoom. */
export interface IncidentPoint {
  type: 'incident';
  incidentId: string;
  lng: number;
  lat: number;
}

export type ClusterLayerPoint = ClusterPoint | IncidentPoint;

/** Builds a fresh cluster index from the incidents that have coordinates. */
export function buildClusterIndex(incidents: Incident[]): IncidentClusterIndex {
  const index = new Supercluster<IncidentPointProps, IncidentPointProps>({
    radius: 50,
    maxZoom: 16,
  });

  const points = incidents
    .filter((i) => i.coordinates !== null)
    .map(
      (incident): PointFeature<IncidentPointProps> => ({
        type: 'Feature',
        properties: { incidentId: incident.id },
        geometry: {
          type: 'Point',
          coordinates: [incident.coordinates!.lng, incident.coordinates!.lat],
        },
      }),
    );

  index.load(points);
  return index;
}

/** Clusters within `bounds` at `zoom`, ready for the marker layer to render. */
export function getClusterLayer(
  index: IncidentClusterIndex,
  bounds: MapBounds,
  zoom: number,
): ClusterLayerPoint[] {
  return index.getClusters(bounds, Math.round(zoom)).map((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    if (isClusterFeature(feature)) {
      return {
        type: 'cluster',
        clusterId: feature.properties.cluster_id,
        lng,
        lat,
        count: feature.properties.point_count,
      };
    }
    return { type: 'incident', incidentId: feature.properties.incidentId, lng, lat };
  });
}

/** Zoom level at which a cluster splits apart, used to zoom-in on click. */
export function getClusterExpansionZoom(index: IncidentClusterIndex, clusterId: number): number {
  return index.getClusterExpansionZoom(clusterId);
}

function isClusterFeature(
  feature: ClusterFeature<IncidentPointProps> | PointFeature<IncidentPointProps>,
): feature is ClusterFeature<IncidentPointProps> {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
}
