/**
 * Client-side data-access for in-app notifications: real backend calls,
 * client-only (mirrors incident-mutations.service.ts) since the TopBar bell
 * polls from a client component. Uses the in-memory access token from
 * useAuthStore with a silent-refresh retry on 401, same as every other
 * authenticated client call.
 */
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, refreshAccessToken } from '@/store/useAuthStore';
import { toAppNotification, type RawNotification } from '@/domain/mappers/notification.mapper';
import type { AppNotification } from '@/domain/models';

function clientFetch<T>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  return apiFetch<T>(path, { ...options, accessToken }, refreshAccessToken);
}

/** `GET /notifications?since=` — omit `since` for the initial (capped) load, pass it for incremental polling. */
export async function getNotifications(since?: string): Promise<AppNotification[]> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const raw = await clientFetch<RawNotification[]>(`/notifications${query}`);
  return raw.map(toAppNotification);
}

/** `PATCH /notifications/:id/read` — must be the notification's own recipient. */
export async function markNotificationRead(id: string): Promise<void> {
  await clientFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' });
}
