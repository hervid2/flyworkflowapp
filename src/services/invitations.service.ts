/**
 * Invitations: the map toolbar's "Share" button, reinterpreted as a real
 * invite-a-collaborator flow (roadmap 8.9, requirements.md §1.5). Two halves,
 * mirroring auth.service.ts's own split: admin-management calls go through
 * the authenticated `clientFetch` (same pattern as settings.service.ts), while
 * the accept-page calls are public — no session exists yet — so they call
 * `apiFetch` directly, `skipAuthRetry: true`, like login/refresh do.
 */
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, refreshAccessToken } from '@/store/useAuthStore';

export type InvitationRole = 'member' | 'admin';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expired: boolean;
  invitedBy: { id: string; name: string };
  createdAt: string;
  expiresAt: string;
  inviteUrl?: string;
}

export interface InvitationPreview {
  email: string;
  role: InvitationRole;
  orgName: string;
  expiresAt: string;
}

function clientFetch<T>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  return apiFetch<T>(path, { ...options, accessToken }, refreshAccessToken);
}

/** `POST /invitations` — admin+ only. `inviteUrl` (the raw token) is only ever present on this response. */
export function createInvitation(dto: {
  email: string;
  role?: InvitationRole;
}): Promise<Invitation> {
  return clientFetch<Invitation>('/invitations', { method: 'POST', body: dto });
}

/** `GET /invitations` — the organization's invitations, most recent first. */
export function listInvitations(): Promise<Invitation[]> {
  return clientFetch<Invitation[]>('/invitations');
}

/** `DELETE /invitations/:id`. */
export function revokeInvitation(id: string): Promise<void> {
  return clientFetch<void>(`/invitations/${id}`, { method: 'DELETE' });
}

/** `GET /invitations/token/:token` — public, backs `/invitar/[token]`. */
export function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiFetch<InvitationPreview>(`/invitations/token/${token}`, {
    skipAuthRetry: true,
  });
}

/** `POST /invitations/token/:token/accept` — public; creates the account and starts a session. */
export function acceptInvitation(
  token: string,
  dto: { name: string; password: string },
): Promise<{ accessToken: string }> {
  return apiFetch<{ accessToken: string }>(`/invitations/token/${token}/accept`, {
    method: 'POST',
    body: dto,
    skipAuthRetry: true,
  });
}
