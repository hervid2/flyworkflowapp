/**
 * Authentication helpers shared by the Playwright specs. `loginViaCookie`
 * seeds a real session into the browser context without driving the login
 * form — faster than `loginViaUI` and avoids coupling most specs to it.
 * `loginViaUI` drives the actual form, used only where the form itself is
 * under test. Requires a real backend reachable at NEXT_PUBLIC_API_URL with
 * the seeded fixture users (see backend/prisma/seed.ts).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';

const ACCESS_TOKEN_COOKIE = 'flyworkflow-access-token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const APP_ORIGIN = 'http://localhost:3000';

// `/auth/login` is throttled to 5 requests/minute per IP (a real security
// control, requirements.md §1.1). Each Playwright *project* (chromium,
// mobile-chrome) gets its own fresh worker process even under `--workers=1`,
// so an in-memory-only cache doesn't span the whole run — a disk cache under
// e2e/.auth/ (gitignored) does. globalSetup.ts pre-warms it once, up front,
// for every credential pair the suite is known to use; fetchAccessToken here
// falls back to a real request only for a pair that wasn't pre-warmed.
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const memoryCache = new Map<string, { accessToken: string; expiresAtMs: number }>();

function cacheFilePath(cacheKey: string): string {
  return path.join(AUTH_DIR, `${Buffer.from(cacheKey).toString('base64url')}.json`);
}

function readDiskCache(cacheKey: string): { accessToken: string; expiresAtMs: number } | null {
  const filePath = cacheFilePath(cacheKey);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as {
      accessToken: string;
      expiresAtMs: number;
    };
  } catch {
    return null;
  }
}

function writeDiskCache(cacheKey: string, entry: { accessToken: string; expiresAtMs: number }) {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(cacheFilePath(cacheKey), JSON.stringify(entry));
}

/**
 * Resolves an access token for (email, password), preferring the in-memory
 * cache, then the on-disk cache (shared across every worker/project), and
 * only hitting the real endpoint — never caching a failure — as a last
 * resort. Exported so global-setup.ts can pre-warm the disk cache with a
 * plain APIRequestContext (no browser/page needed there).
 */
export async function fetchAccessToken(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const cacheKey = `${email}:${password}`;

  const cached = memoryCache.get(cacheKey) ?? readDiskCache(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) {
    memoryCache.set(cacheKey, cached);
    return cached.accessToken;
  }

  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    // Never cache a failure (e.g. a 429 from the login throttle) — that
    // would silently poison every subsequent call for this credential pair.
    throw new Error(
      `POST /auth/login for ${email} returned ${response.status()} — ${await response.text()}`,
    );
  }
  const { accessToken } = (await response.json()) as { accessToken: string };
  // Access tokens are short-lived (900s in deploy); refresh the cache a
  // minute early so a token never expires mid-test.
  const entry = { accessToken, expiresAtMs: Date.now() + 14 * 60_000 };
  memoryCache.set(cacheKey, entry);
  writeDiskCache(cacheKey, entry);
  return accessToken;
}

/**
 * Bypass the login page by seeding a real session (cached, see above).
 * Faster than loginViaUI and avoids coupling most specs to the login form.
 * Call BEFORE the first page.goto() so the middleware sees the cookie.
 */
export async function loginViaCookie(
  page: Page,
  email = 'camila.rojas@flyworkflow.io',
  password = 'FlyWorkFlow2026!',
) {
  const accessToken = await fetchAccessToken(page.request, email, password);

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
