import { MediaType } from '@prisma/client';

/** Server-side allowlist (requirements.md §1.7 Should: "not just the client"). */
export const ALLOWED_MEDIA_CONTENT_TYPES: Record<MediaType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const MAX_MEDIA_SIZE_BYTES: Record<MediaType, number> = {
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

export function mediaTypeFromContentType(
  contentType: string,
): MediaType | null {
  const entry = (
    Object.entries(ALLOWED_MEDIA_CONTENT_TYPES) as [MediaType, string[]][]
  ).find(([, contentTypes]) => contentTypes.includes(contentType));
  return entry?.[0] ?? null;
}
