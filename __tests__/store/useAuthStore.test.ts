/**
 * Unit tests for the auth store. Mocks `@/services/auth.service` (the only
 * network boundary) and drives the store through its public actions,
 * asserting both the resulting state and the access-token cookie mirror
 * (read directly via `document.cookie`, matching how the store itself reads
 * it — see `useAuthStore.ts`'s module comment on why the cookie isn't the
 * source of truth).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, refreshAccessToken, type AuthUser } from '@/store/useAuthStore';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookie';
import * as authService from '@/services/auth.service';

vi.mock('@/services/auth.service', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

const user: AuthUser = {
  id: 'u-1',
  name: 'Ana Ruiz',
  email: 'ana@example.com',
  role: 'admin',
  orgId: 'org-1',
};

function makeJwt(exp: number | undefined): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const payload = btoa(JSON.stringify(exp === undefined ? {} : { exp }));
  return `${header}.${payload}.sig`;
}

function futureToken(): string {
  return makeJwt(Math.floor(Date.now() / 1000) + 3600);
}

function expiredToken(): string {
  return makeJwt(Math.floor(Date.now() / 1000) - 3600);
}

function clearCookie() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`;
}

function readAccessTokenCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${ACCESS_TOKEN_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookie();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hydrated: false,
    });
  });

  it('login guarda el usuario, marca autenticado/hidratado y refleja el token en la cookie', () => {
    const token = futureToken();
    useAuthStore.getState().login(user, token);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe(token);
    expect(state.isAuthenticated).toBe(true);
    expect(state.hydrated).toBe(true);
    expect(readAccessTokenCookie()).toBe(token);
  });

  it('login con un token sin exp cae al max-age por defecto sin lanzar', () => {
    const token = makeJwt(undefined);
    expect(() => useAuthStore.getState().login(user, token)).not.toThrow();
    expect(readAccessTokenCookie()).toBe(token);
  });

  it('setAccessToken actualiza el token y la cookie sin tocar el usuario', () => {
    useAuthStore.getState().login(user, futureToken());
    const nextToken = futureToken();
    useAuthStore.getState().setAccessToken(nextToken);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(nextToken);
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(readAccessTokenCookie()).toBe(nextToken);
  });

  it('logout llama al servicio con el token actual, limpia el estado y la cookie', async () => {
    const token = futureToken();
    useAuthStore.getState().login(user, token);
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(authService.logout).toHaveBeenCalledWith(token);
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.hydrated).toBe(true);
    expect(readAccessTokenCookie()).toBeNull();
  });

  describe('hydrateFromCookie', () => {
    it('no hace nada si ya estaba hidratado', async () => {
      useAuthStore.setState({ hydrated: true });
      await useAuthStore.getState().hydrateFromCookie();
      expect(authService.getMe).not.toHaveBeenCalled();
      expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('con cookie vigente, resuelve el usuario vía getMe sin llamar a refresh', async () => {
      const token = futureToken();
      document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/`;
      vi.mocked(authService.getMe).mockResolvedValue(user);

      await useAuthStore.getState().hydrateFromCookie();

      expect(authService.getMe).toHaveBeenCalledWith(token);
      expect(authService.refresh).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.accessToken).toBe(token);
      expect(state.isAuthenticated).toBe(true);
      expect(state.hydrated).toBe(true);
    });

    it('si getMe rechaza la cookie vigente, cae a refresh y resuelve con el token nuevo', async () => {
      const cookieToken = futureToken();
      document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(cookieToken)}; path=/`;
      const freshToken = futureToken();
      vi.mocked(authService.getMe)
        .mockRejectedValueOnce(new Error('revoked'))
        .mockResolvedValueOnce(user);
      vi.mocked(authService.refresh).mockResolvedValue(freshToken);

      await useAuthStore.getState().hydrateFromCookie();

      expect(authService.refresh).toHaveBeenCalled();
      expect(authService.getMe).toHaveBeenLastCalledWith(freshToken);
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(freshToken);
      expect(state.isAuthenticated).toBe(true);
      expect(readAccessTokenCookie()).toBe(freshToken);
    });

    it('con la cookie expirada, ignora la cookie y usa refresh directamente', async () => {
      document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(expiredToken())}; path=/`;
      const freshToken = futureToken();
      vi.mocked(authService.refresh).mockResolvedValue(freshToken);
      vi.mocked(authService.getMe).mockResolvedValue(user);

      await useAuthStore.getState().hydrateFromCookie();

      expect(authService.refresh).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('sin cookie y sin sesión de refresh, termina como no autenticado e hidratado', async () => {
      vi.mocked(authService.refresh).mockResolvedValue(null);

      await useAuthStore.getState().hydrateFromCookie();

      expect(authService.getMe).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.hydrated).toBe(true);
      expect(readAccessTokenCookie()).toBeNull();
    });

    it('si refresh entrega token pero getMe falla, termina como no autenticado e hidratado', async () => {
      vi.mocked(authService.refresh).mockResolvedValue(futureToken());
      vi.mocked(authService.getMe).mockRejectedValue(new Error('boom'));

      await useAuthStore.getState().hydrateFromCookie();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.hydrated).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    it('cuando refresh resuelve un token, actualiza el store y lo retorna', async () => {
      const freshToken = futureToken();
      vi.mocked(authService.refresh).mockResolvedValue(freshToken);

      const result = await refreshAccessToken();

      expect(result).toBe(freshToken);
      expect(useAuthStore.getState().accessToken).toBe(freshToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('cuando refresh resuelve null, no toca el store y retorna null', async () => {
      vi.mocked(authService.refresh).mockResolvedValue(null);

      const result = await refreshAccessToken();

      expect(result).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });
});
