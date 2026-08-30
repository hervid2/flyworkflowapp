/**
 * Client-side, unverified JWT payload decode. Signature/expiration are
 * authoritatively checked server-side (NestJS on every API call, the Edge
 * middleware on every navigation) — this only reads `exp` for UX purposes:
 * sizing the mirrored access-token cookie and deciding whether a token found
 * on page load is worth using before a network round-trip confirms it.
 */
export function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const decoded = JSON.parse(json) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

/** True when the token's `exp` claim is missing or already in the past. */
export function isJwtExpired(token: string): boolean {
  const exp = decodeJwtExp(token);
  if (exp === null) return true;
  return exp * 1000 <= Date.now();
}
