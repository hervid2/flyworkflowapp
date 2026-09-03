/**
 * Client-side mutations for the authenticated user's own settings: profile
 * (name, avatar) and password. Mirrors incident-mutations.service.ts — uses
 * the in-memory access token from useAuthStore with a silent-refresh retry
 * on 401, same as every other authenticated client call.
 */
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, refreshAccessToken } from '@/store/useAuthStore';
import type { AuthUser } from '@/store/useAuthStore';

interface UserProfileResponse {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
}

function clientFetch<T>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  return apiFetch<T>(path, { ...options, accessToken }, refreshAccessToken);
}

function toAuthUser(profile: UserProfileResponse): AuthUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl ?? undefined,
    role: profile.role,
    orgId: profile.orgId,
  };
}

/** `PATCH /users/me` — `avatarUrl: null` clears it, `undefined`/omitted leaves it untouched. */
export async function updateProfile(dto: {
  name?: string;
  avatarUrl?: string | null;
}): Promise<AuthUser> {
  const raw = await clientFetch<UserProfileResponse>('/users/me', {
    method: 'PATCH',
    body: dto,
  });
  return toAuthUser(raw);
}

/** `PATCH /users/me/password`. Throws {@link ApiError} with status 401 when `currentPassword` doesn't match. */
export async function changePassword(dto: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await clientFetch<void>('/users/me/password', { method: 'PATCH', body: dto });
}
