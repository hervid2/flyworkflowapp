/**
 * Authentication helpers shared by the Playwright specs. Offers a fast
 * cookie-injection login (default) and a full UI login used only where the
 * login form itself is under test.
 */
import type { Page } from '@playwright/test';

// Builds the exact cookie value that useAuthStore.persist writes via its custom cookieStorage.
// The cookie value is the URL-encoded JSON of { state: {...}, version: 0 }.
function buildAuthCookieValue() {
  const payload = {
    state: {
      user: {
        id: 'flyworkflow_u1',
        name: 'Camila Rojas',
        email: 'camila.rojas@flyworkflow.io',
        avatarUrl: 'https://i.pravatar.cc/150?u=camila.rojas',
        role: 'Superadmin',
        company: 'FLYWORKFLOW',
      },
      token: 'e2e-test-token-abc123',
      isAuthenticated: true,
    },
    version: 0,
  };
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Bypass the login page by injecting auth cookies directly.
 * Faster than loginViaUI and avoids coupling tests to the login form.
 * Call BEFORE the first page.goto() so the middleware sees the session cookie.
 */
export async function loginViaCookie(page: Page) {
  await page.context().addCookies([
    {
      name: 'spybee-session',
      value: '1',
      url: 'http://localhost:3000',
      sameSite: 'Lax',
    },
    {
      name: 'spybee-auth',
      value: buildAuthCookieValue(),
      url: 'http://localhost:3000',
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
  password = 'flyworkflow123',
) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}
