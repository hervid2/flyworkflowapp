import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import {
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from '../../modules/auth/auth.constants';

/**
 * Sets the `httpOnly` refresh-token cookie. Shared by every flow that issues
 * a session (`/auth/login`, `/auth/refresh`, and the invitation-accept flow,
 * which auto-logs a newly created user in) so the `secure`/`sameSite` rules
 * stay in exactly one place. `secure`/`sameSite` follow `NODE_ENV`:
 * `best-practices.md §Security` calls for `Secure; SameSite=None` for the
 * real cross-domain Vercel↔API Gateway deployment (F6.3+), but that
 * combination requires HTTPS — local dev and CI run over plain HTTP, where a
 * `Secure` cookie would silently never be stored by the browser.
 */
export function setRefreshCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const isProd = configService.get('NODE_ENV') === 'production';
  const ttlDays = configService.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS', 7);
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: ttlDays * 24 * 60 * 60 * 1000,
  });
}
