// Short-lived and single-use per incident upload (requirements.md §1.7 —
// "a single-use URL with a short expiration").
export const DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60;
