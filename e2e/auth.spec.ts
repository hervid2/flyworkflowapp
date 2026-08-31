/**
 * E2E coverage of the authentication flow: valid/invalid credentials, inline
 * email validation, middleware route protection (redirect to /login), and a
 * mobile-viewport smoke check. Exercises the real login form via the UI.
 */
import { test, expect } from '@playwright/test';
import { loginViaCookie, loginViaUI } from './helpers/auth';

test.describe('Autenticación', () => {
  test('credenciales válidas redirigen a /mapa', async ({ page, isMobile }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL(/\/mapa/, { timeout: 10_000 });
    // TopBar shows the logged-in user's name on desktop; on mobile only the avatar is shown
    if (!isMobile) {
      await expect(page.getByText('Camila Rojas')).toBeVisible();
    }
  });

  test('credenciales inválidas muestran error y permanecen en /login', async ({ page }) => {
    await loginViaUI(page, 'camila.rojas@flyworkflow.io', 'wrongpassword');
    // Server error alert should appear
    await expect(
      page
        .getByRole('alert', { name: /credenciales inválidas/i })
        .or(page.locator('[aria-live="assertive"]').filter({ hasText: 'Credenciales inválidas' })),
    ).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('email con formato inválido muestra error inline sin llamar al servidor', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill('no-es-un-email');
    await page.getByLabel('Contraseña', { exact: true }).fill('flyworkflow123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Introduce un email válido')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('acceso directo a /dashboard sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('acceso directo a /mapa sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/mapa');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Responsive smoke: an authenticated session reaches /mapa at a narrow
// viewport without being redirected to /login. The real login FORM at mobile
// width is already exercised by "credenciales válidas redirigen a /mapa"
// above under the mobile-chrome project (isMobile) — no need to drive it a
// second time here (loginViaUI is real/uncached by design, unlike
// loginViaCookie, so duplicating it needlessly eats into the login
// endpoint's 5-requests-per-minute throttle, requirements.md §1.1).
test.describe('Autenticación — mobile (375×812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sesión autenticada llega a /mapa en viewport móvil', async ({ page }) => {
    await loginViaCookie(page);
    await page.goto('/mapa');
    await expect(page).toHaveURL(/\/mapa/, { timeout: 10_000 });
  });
});
