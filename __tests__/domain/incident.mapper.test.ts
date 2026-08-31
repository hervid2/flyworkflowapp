/**
 * Unit tests for toIncident: verifies the backend raw shape is mapped onto
 * the frontend domain model field-by-field, including the two lossy/derived
 * fields (`order` always defaults to 0, `avatarUrl: null` becomes `undefined`).
 */
import { describe, it, expect } from 'vitest';
import { toIncident, type RawIncident } from '@/domain/mappers/incident.mapper';

const rawIncident: RawIncident = {
  id: 'inc-100',
  sequenceId: '0100',
  title: 'Filtración en sótano',
  description: 'Agua acumulada cerca del cuarto eléctrico',
  priority: 'high',
  status: 'open',
  approval: 'pending',
  deleted: false,
  coordinates: { lat: 4.65, lng: -74.1 },
  locationDescription: 'Sótano 1',
  dueDate: '2026-09-01',
  closingDate: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-02T10:00:00Z',
  project: { id: 'proj-9', name: 'Torre Norte' },
  type: { id: 'type-1', key: 'plumbing', name: 'Hidrosanitario', nameEn: 'Plumbing' },
  owner: { id: 'u-1', name: 'Ana Ruiz', email: 'ana@example.com', avatarUrl: 'https://cdn/a.png' },
  assignees: [{ id: 'u-2', name: 'Luis Pardo', email: 'luis@example.com', avatarUrl: null }],
  observers: [{ id: 'u-3', name: 'Marta Gil', email: 'marta@example.com', avatarUrl: null }],
  tags: [{ id: 'tag-1', name: 'Urgente', color: '#ff0000' }],
};

describe('toIncident', () => {
  it('mapea todos los campos escalares y anidados al modelo de dominio', () => {
    const incident = toIncident(rawIncident);

    expect(incident.id).toBe('inc-100');
    expect(incident.sequenceId).toBe('0100');
    expect(incident.title).toBe('Filtración en sótano');
    expect(incident.description).toBe('Agua acumulada cerca del cuarto eléctrico');
    expect(incident.priority).toBe('high');
    expect(incident.status).toBe('open');
    expect(incident.approval).toBe('pending');
    expect(incident.project).toEqual({ id: 'proj-9', name: 'Torre Norte' });
    expect(incident.coordinates).toEqual({ lat: 4.65, lng: -74.1 });
    expect(incident.locationDescription).toBe('Sótano 1');
    expect(incident.dueDate).toBe('2026-09-01');
    expect(incident.closingDate).toBeNull();
    expect(incident.createdAt).toBe('2026-08-01T10:00:00Z');
    expect(incident.updatedAt).toBe('2026-08-02T10:00:00Z');
    expect(incident.deleted).toBe(false);
    expect(incident.tags).toEqual([{ id: 'tag-1', name: 'Urgente', color: '#ff0000' }]);
  });

  it('siempre inicializa order en 0 y media en un array vacío', () => {
    const incident = toIncident(rawIncident);
    expect(incident.order).toBe(0);
    expect(incident.media).toEqual([]);
  });

  it('traduce el catálogo de tipo (nameEn -> name_en)', () => {
    const incident = toIncident(rawIncident);
    expect(incident.type).toEqual({
      id: 'type-1',
      key: 'plumbing',
      name: 'Hidrosanitario',
      name_en: 'Plumbing',
    });
  });

  it('conserva avatarUrl cuando el usuario lo tiene', () => {
    const incident = toIncident(rawIncident);
    expect(incident.owner).toEqual({
      id: 'u-1',
      name: 'Ana Ruiz',
      email: 'ana@example.com',
      avatarUrl: 'https://cdn/a.png',
    });
  });

  it('convierte avatarUrl null a undefined en usuarios referenciados', () => {
    const incident = toIncident(rawIncident);
    expect(incident.assignees[0].avatarUrl).toBeUndefined();
    expect(incident.observers[0].avatarUrl).toBeUndefined();
  });

  it('mapea assignees y observers preservando el orden y la cantidad', () => {
    const raw: RawIncident = {
      ...rawIncident,
      assignees: [
        { id: 'a1', name: 'A1', email: 'a1@example.com', avatarUrl: null },
        { id: 'a2', name: 'A2', email: 'a2@example.com', avatarUrl: null },
      ],
      observers: [],
    };
    const incident = toIncident(raw);
    expect(incident.assignees.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(incident.observers).toEqual([]);
  });

  it('preserva coordinates y closingDate nulos', () => {
    const raw: RawIncident = {
      ...rawIncident,
      coordinates: null,
      closingDate: '2026-09-05',
    };
    const incident = toIncident(raw);
    expect(incident.coordinates).toBeNull();
    expect(incident.closingDate).toBe('2026-09-05');
  });
});
