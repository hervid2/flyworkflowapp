import { MediaType } from '@prisma/client';

/**
 * Project plans are scoped to "image/PDF" only (requirements.md §1.2 Could)
 * — narrower than `media.constants.ts`'s allowlist, which also covers video
 * and Word documents that don't apply to a project plan.
 */
export const ALLOWED_PROJECT_PLAN_CONTENT_TYPES: Record<
  Extract<MediaType, 'image' | 'document'>,
  string[]
> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf'],
};

export const MAX_PROJECT_PLAN_SIZE_BYTES = 20 * 1024 * 1024;

export function projectPlanTypeFromContentType(
  contentType: string,
): 'image' | 'document' | null {
  const entry = (
    Object.entries(ALLOWED_PROJECT_PLAN_CONTENT_TYPES) as [
      'image' | 'document',
      string[],
    ][]
  ).find(([, contentTypes]) => contentTypes.includes(contentType));
  return entry?.[0] ?? null;
}
