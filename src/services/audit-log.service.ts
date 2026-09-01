/**
 * Read-side data-access for the audit trail: real backend calls, server-only
 * (mirrors incidents.service.ts). `GET /audit-log` is admin+ only on the
 * backend — a plain member resolves to a 403 `ApiError`, which the
 * `/historial` page catches to render an access-restricted state instead of
 * throwing.
 */
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api-client';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookie';
import { toAuditLogEntry, type RawAuditLogEntry } from '@/domain/mappers/audit-log.mapper';
import type { AuditLogEntry } from '@/domain/models';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface GetAuditLogParams {
  page?: number;
  projectId?: string;
  userId?: string;
}

interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

/** `GET /audit-log`, server-side paginated (unlike incidents, the audit trail isn't fully loaded client-side). */
export async function getAuditLog(params: GetAuditLogParams = {}): Promise<AuditLogPage> {
  const accessToken = await getAccessToken();
  const query = new URLSearchParams({ page: String(params.page ?? 1) });
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.userId) query.set('userId', params.userId);

  const res = await apiFetch<PaginatedResponse<RawAuditLogEntry>>(
    `/audit-log?${query.toString()}`,
    { accessToken },
  );

  return { ...res, items: res.items.map(toAuditLogEntry) };
}
