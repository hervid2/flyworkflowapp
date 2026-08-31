/**
 * Unit tests for the F2.6 map filter fix (docs/roadmap.md): the date picker
 * and "last N visits" slider must actually narrow which incidents the map
 * plots, not just write to the store unread.
 */
import { describe, it, expect } from 'vitest';
import { filterIncidentsByMapWindow } from '@/domain/selectors/map-filters.selector';
import type { Incident, MapFilters } from '@/domain/models';

function makeIncident(id: string, createdAt: string): Incident {
  return {
    id,
    sequenceId: '0001',
    order: 1,
    title: `Incidencia ${id}`,
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
    createdAt: `${createdAt}T10:00:00.000Z`,
    updatedAt: `${createdAt}T10:00:00.000Z`,
  };
}

// Five distinct report days plus a same-day duplicate, spanning May 1–10.
const INCIDENTS: Incident[] = [
  makeIncident('may01', '2026-05-01'),
  makeIncident('may03-a', '2026-05-03'),
  makeIncident('may03-b', '2026-05-03'), // same day as may03-a — one "visit"
  makeIncident('may05', '2026-05-05'),
  makeIncident('may08', '2026-05-08'),
  makeIncident('may10', '2026-05-10'), // after the reference date below
];

function filters(overrides: Partial<MapFilters>): MapFilters {
  return { date: '2026-05-08', lastVisits: 5, ...overrides };
}

describe('filterIncidentsByMapWindow', () => {
  it('excluye incidencias reportadas después de la fecha de referencia', () => {
    const result = filterIncidentsByMapWindow(INCIDENTS, filters({ lastVisits: 5 }));
    expect(result.map((i) => i.id)).not.toContain('may10');
  });

  it('con lastVisits=1 conserva solo el día de reporte más reciente hasta la fecha', () => {
    const result = filterIncidentsByMapWindow(INCIDENTS, filters({ lastVisits: 1 }));
    expect(result.map((i) => i.id).sort()).toEqual(['may08']);
  });

  it('con lastVisits=2 conserva los 2 días de reporte más recientes hasta la fecha', () => {
    const result = filterIncidentsByMapWindow(INCIDENTS, filters({ lastVisits: 2 }));
    expect(result.map((i) => i.id).sort()).toEqual(['may05', 'may08']);
  });

  it('varias incidencias el mismo día cuentan como una sola visita', () => {
    // 3 most recent distinct report-days up to 2026-05-08 are 05-08, 05-05, 05-03
    // (05-03 has two incidents but still counts as one day/visit) — 05-01 is excluded.
    const result = filterIncidentsByMapWindow(INCIDENTS, filters({ lastVisits: 3 }));
    expect(result.map((i) => i.id).sort()).toEqual(['may03-a', 'may03-b', 'may05', 'may08']);
  });

  it('retorna vacío cuando la fecha de referencia es anterior a todos los reportes', () => {
    const result = filterIncidentsByMapWindow(INCIDENTS, filters({ date: '2026-04-01' }));
    expect(result).toEqual([]);
  });
});
