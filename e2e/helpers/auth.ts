/**
 * Authentication helpers shared by the Playwright specs. `loginViaCookie`
 * calls the real backend's `/auth/login` directly (skipping the login page
 * UI) and seeds the resulting session into the browser context — faster than
 * loginViaUI and avoids coupling most specs to the login form. `loginViaUI`
 * drives the actual form, used only where the form itself is under test.
 * Requires a real backend reachable at NEXT_PUBLIC_API_URL with the seeded
 * fixture users (see backend/prisma/seed.ts).
 */
import type { Page } from '@playwright/test';

const ACCESS_TOKEN_COOKIE = 'flyworkflow-access-token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const APP_ORIGIN = 'http://localhost:3000';

// `/auth/login` is throttled to 5 requests/minute per IP (a real security
// control, requirements.md §1.1) — the suite calls loginViaCookie far more
// often than that, so real logins are cached per worker process (each
// Playwright worker is its own Node process) and reused until they're close
// to the access token's TTL, rather than hitting the endpoint every call.
const tokenCache = new Map<string, { accessToken: string; expiresAtMs: number }>();

async function fetchAccessToken(page: Page, email: string, password: string): Promise<string> {
  const cacheKey = `${email}:${password}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.accessToken;
  }

  const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  const { accessToken } = (await response.json()) as { accessToken: string };
  // Access tokens are short-lived (900s in deploy); refresh the cache a
  // minute early so a token never expires mid-test.
  tokenCache.set(cacheKey, { accessToken, expiresAtMs: Date.now() + 14 * 60_000 });
  return accessToken;
}

/**
 * Bypass the login page by calling the real backend directly (cached per
 * worker, see above). Faster than loginViaUI and avoids coupling most specs
 * to the login form. Call BEFORE the first page.goto() so the middleware
 * sees the cookie.
 */
export async function loginViaCookie(
  page: Page,
  email = 'camila.rojas@flyworkflow.io',
  password = 'FlyWorkFlow2026!',
) {
  const accessToken = await fetchAccessToken(page, email, password);

  await page.context().addCookies([
    {
      name: ACCESS_TOKEN_COOKIE,
      value: accessToken,
      url: APP_ORIGIN,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Full UI login flow — use only in auth.spec.ts where the login form itself is under test.
 */
export async function loginViaUI(
  page: Page,
  email = 'camila.rojas@flyworkflow.io',
  password = 'FlyWorkFlow2026!',
) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}
