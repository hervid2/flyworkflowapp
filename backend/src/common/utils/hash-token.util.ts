import { createHash } from 'node:crypto';

/**
 * High-entropy random tokens (refresh tokens, invitation tokens) are looked
 * up by exact match, so a deterministic digest — not bcrypt's salted hash —
 * is what makes a `WHERE tokenHash = ?` lookup possible.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
