/**
 * Read-side data-access for incidents: real backend calls, server-only (see
 * incident-mutations.service.ts for the client-safe write side). Runs from
 * Server Components (dashboard/mapa page.tsx), which forward the access
 * token read off the mirrored cookie — by the time a Server Component
 * renders, `middleware.ts` has already verified that cookie, so there is no
 * refresh-on-401 path here the way client-side calls have one.
 */
import { cookies } from 'next/headers';
import { apiFetch, ApiError } from '@/lib/api-client';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookie';
import { toIncident, type RawIncident } from '@/domain/mappers/incident.mapper';
import type { Incident } from '@/domain/models';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 100;

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

/**
 * `GET /incidents`, looped across pages until the full set is fetched. The
 * dashboard/map selectors aggregate and filter client-side over the whole
 * collection (no server-side pagination support in that chain yet) — this is
 * a bridge to keep that architecture working against the real API, not a
 * long-term scaling design; see roadmap.md Phase 7 decision #3.
 */
export async function getIncidents(): Promise<Incident[]> {
  const accessToken = await getAccessToken();
  const all: RawIncident[] = [];
  let page = 1;

  for (;;) {
    const res = await apiFetch<PaginatedResponse<RawIncident>>(
      `/incidents?page=${page}&pageSize=${PAGE_SIZE}`,
      { accessToken },
    );
    all.push(...res.items);
    if (all.length >= res.total || res.items.length === 0) break;
    page += 1;
  }

  return all.map(toIncident);
}

/** `GET /incidents/:id` — resolves to `null` on a 404 (doesn't exist or belongs to another org). */
export async function getIncidentById(id: string): Promise<Incident | null> {
  const accessToken = await getAccessToken();
  try {
    const raw = await apiFetch<RawIncident>(`/incidents/${id}`, { accessToken });
    return toIncident(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
