/**
 * Regression test for docs/roadmap.md F2.3: the selectable catalog used to
 * expose only 11 of the 15 incident types present in the mock dataset
 * (scripts/generate-mock-data.ts). Guards against that gap reopening.
 */
import { describe, it, expect } from 'vitest';
import { INCIDENT_TYPES } from '@/lib/constants/incident-types';

describe('INCIDENT_TYPES', () => {
  it('expone los 15 tipos de incidencia del dominio', () => {
    expect(INCIDENT_TYPES).toHaveLength(15);
  });

  it('no tiene ids ni keys duplicados', () => {
    const ids = INCIDENT_TYPES.map((t) => t.id);
    const keys = INCIDENT_TYPES.map((t) => t.key);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('incluye los 4 tipos que faltaban en el selector', () => {
    const keys = INCIDENT_TYPES.map((t) => t.key);
    expect(keys).toEqual(
      expect.arrayContaining(['excavation', 'foundation', 'soil-study', 'urban_planning']),
    );
  });
});
