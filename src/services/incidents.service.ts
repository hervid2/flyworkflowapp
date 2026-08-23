/**
 * Read-side data-access for incidents: emulates a REST API on top of a static
 * mock dataset, read straight off disk, so Server Components code against an
 * async service call exactly as they would against a real backend. Server-only
 * (see create-incident.service.ts for the client-safe write side).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Incident } from '@/domain/models/incident.model';

const LOCAL_PATH = join(process.cwd(), 'public', 'mocks', 'incidents.mock.json');

/**
 * Simulates GET /incidents. Reads the mock file straight off disk (this
 * function only ever runs server-side, from page.tsx Server Components) —
 * `fetch()` with a relative URL has no origin to resolve against outside a
 * browser, which broke at build/request time once this stopped falling back
 * from a remote absolute URL.
 */
export async function getIncidents(): Promise<Incident[]> {
  const raw = JSON.parse(await readFile(LOCAL_PATH, 'utf-8')) as Incident[];
  return raw.filter((i) => !i.deleted);
}

/**
 * Simulates GET /incidents/:id
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  const all = await getIncidents();
  return all.find((i) => i.id === id) ?? null;
}
