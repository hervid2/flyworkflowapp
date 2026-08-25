/** Carries the opaque refresh token; scoped to `/auth` so no other route ever receives it. */
export const REFRESH_TOKEN_COOKIE = 'flyworkflow-refresh-token';
export const REFRESH_TOKEN_COOKIE_PATH = '/auth';

// Seconds, not a "15m"-style string: jsonwebtoken only type-checks the
// string form against a fixed literal union (`ms`'s `StringValue`), which a
// runtime env value can never satisfy — a plain number of seconds is always
// valid for `SignOptions.expiresIn`.
export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;

/** Strict, login-only limit (`requirements.md §1.1`); the app-wide limiter arrives in F6.3. */
export const LOGIN_THROTTLE_LIMIT = 5;
export const LOGIN_THROTTLE_TTL_MS = 60_000;
