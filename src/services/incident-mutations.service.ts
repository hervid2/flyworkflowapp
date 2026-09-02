/**
 * Client-side incident mutations against the real backend: create, status
 * change, delete. Split out of the read side (incidents.service.ts, which
 * is server-only — reads `next/headers`) so this stays importable from
 * client components. Uses the in-memory access token from useAuthStore with
 * a silent-refresh retry on 401, same as every other authenticated client call.
 */
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, refreshAccessToken } from '@/store/useAuthStore';
import { toIncident, type RawIncident } from '@/domain/mappers/incident.mapper';
import type {
  Incident,
  CreateIncidentDto,
  IncidentStatus,
  Project,
  ApprovalStatus,
} from '@/domain/models';

function clientFetch<T>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  return apiFetch<T>(path, { ...options, accessToken }, refreshAccessToken);
}

/**
 * `POST /incidents`. The owner comes from the JWT server-side — no user
 * argument needed here. Media attachments are handled separately after
 * creation (presigned S3 upload flow), since the backend requires an
 * existing incident id to attach media to.
 */
export async function createIncident(dto: CreateIncidentDto, project: Project): Promise<Incident> {
  const raw = await clientFetch<RawIncident>('/incidents', {
    method: 'POST',
    body: {
      projectId: project.id,
      typeId: dto.type.id,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      ...(dto.dueDate ? { dueDate: new Date(dto.dueDate).toISOString() } : {}),
      ...(dto.locationDescription ? { locationDescription: dto.locationDescription } : {}),
      ...(dto.coordinates ? { coordinates: dto.coordinates } : {}),
      ...(dto.assignees.length ? { assigneeIds: dto.assignees.map((a) => a.id) } : {}),
      ...(dto.observers.length ? { observerIds: dto.observers.map((o) => o.id) } : {}),
      ...(dto.tags.length ? { tagIds: dto.tags.map((t) => t.id) } : {}),
    },
  });
  return toIncident(raw);
}

/** `PATCH /incidents/:id/status` — follows the backend's allowed transition graph; a `409` means an invalid one. */
export async function updateIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
  const raw = await clientFetch<RawIncident>(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return toIncident(raw);
}

/** `DELETE /incidents/:id` — soft delete (author or admin+). */
export async function deleteIncident(id: string): Promise<void> {
  await clientFetch<void>(`/incidents/${id}`, { method: 'DELETE' });
}

/** `POST /incidents/:id/restore` — admin+, brings a soft-deleted incident back out of the trash. */
export async function restoreIncident(id: string): Promise<Incident> {
  const raw = await clientFetch<RawIncident>(`/incidents/${id}/restore`, { method: 'POST' });
  return toIncident(raw);
}

/** `PATCH /incidents/:id/approval` — admin+, decides a pending incident; a `409` means it was already decided. */
export async function updateIncidentApproval(
  id: string,
  decision: Extract<ApprovalStatus, 'approved' | 'rejected'>,
  reason?: string,
): Promise<Incident> {
  const raw = await clientFetch<RawIncident>(`/incidents/${id}/approval`, {
    method: 'PATCH',
    body: { decision, ...(reason ? { reason } : {}) },
  });
  return toIncident(raw);
}
