/**
 * Real authentication service, talking to the FlyWorkFlow backend. The
 * access token never lives in a cookie the backend itself set (it comes back
 * in the `/auth/login` JSON body); the refresh token is the backend's
 * `httpOnly` cookie, sent automatically via `credentials: 'include'`.
 */
import { apiFetch } from '@/lib/api-client';
import type { AuthUser } from '@/store/useAuthStore';

interface LoginResponse {
  accessToken: string;
}

interface UserProfileResponse {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
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

/** `GET /users/me` — the JWT payload alone has no name/avatar, so this always follows a successful login/refresh. */
export async function getMe(accessToken: string): Promise<AuthUser> {
  const profile = await apiFetch<UserProfileResponse>('/users/me', { accessToken });
  return toAuthUser(profile);
}

/**
 * `POST /auth/login`. Throws {@link ApiError} on invalid credentials (401) or
 * rate limiting (429) — the caller maps those to a user-facing message.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthUser; accessToken: string }> {
  const { accessToken } = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRetry: true,
  });
  const user = await getMe(accessToken);
  return { user, accessToken };
}

/** `POST /auth/logout`. Best-effort — the caller clears local state regardless of the outcome. */
export async function logout(accessToken: string | null): Promise<void> {
  if (!accessToken) return;
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST', accessToken, skipAuthRetry: true });
  } catch {
    // Local session is cleared either way; nothing more to do if the server call fails.
  }
}

/**
 * `POST /auth/refresh`. Relies solely on the `httpOnly` refresh cookie —
 * returns `null` (never throws) when there is no valid session to refresh,
 * so callers can treat it as a plain "is there still a session?" check.
 */
export async function refresh(): Promise<string | null> {
  try {
    const { accessToken } = await apiFetch<LoginResponse>('/auth/refresh', {
      method: 'POST',
      skipAuthRetry: true,
    });
    return accessToken;
  } catch {
    return null;
  }
}
