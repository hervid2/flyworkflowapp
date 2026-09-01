/**
 * Name of the cookie mirroring the in-memory access token. Non-`httpOnly` by
 * design: the browser-side auth store reads/writes it directly, the Edge
 * middleware verifies it on every navigation, and Server Components forward
 * it as the `Bearer` token for their initial data fetch. Shared here so all
 * three agree on the name.
 */
export const ACCESS_TOKEN_COOKIE = 'flyworkflow-access-token';
