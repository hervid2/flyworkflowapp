/**
 * Read-side data-access for the incident trash: real backend calls,
 * server-only (mirrors incidents.service.ts). `GET /incidents/trash` is
 * admin+ only on the backend — a plain member resolves to a 403 `ApiError`,
 * which the `/papelera` page catches to render an access-restricted state
 * instead of throwing.
 */
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api-client';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookie';
import { toIncident, type RawIncident } from '@/domain/mappers/incident.mapper';
import type { Incident } from '@/domain/models';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface TrashPage {
  items: Incident[];
  total: number;
  page: number;
  pageSize: number;
}

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

/** `GET /incidents/trash`, server-side paginated soft-deleted incidents. */
export async function getTrash(page = 1): Promise<TrashPage> {
  const accessToken = await getAccessToken();
  const res = await apiFetch<PaginatedResponse<RawIncident>>(`/incidents/trash?page=${page}`, {
    accessToken,
  });

  return { ...res, items: res.items.map(toIncident) };
}
