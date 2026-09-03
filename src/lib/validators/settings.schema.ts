/**
 * Zod schemas for the `/ajustes` (settings) forms: profile (name, avatar URL)
 * and password change. Same translator-factory pattern as
 * `createIssueFormSchema` — built per-render from `useTranslations('validation')`
 * so error copy follows the active locale.
 */
import { z } from 'zod';

type ValidationTranslator = (key: string) => string;

export function createProfileFormSchema(t: ValidationTranslator) {
  return z.object({
    name: z.string().min(1, t('name.required')).max(120, t('name.max')),
    avatarUrl: z.union([z.literal(''), z.url(t('avatarUrl.invalid'))]).optional(),
  });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>;

export function createPasswordFormSchema(t: ValidationTranslator) {
  return z
    .object({
      currentPassword: z.string().min(1, t('password.currentRequired')),
      newPassword: z.string().min(8, t('password.newMin')),
      confirmPassword: z.string().min(1, t('password.confirmRequired')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('password.mismatch'),
      path: ['confirmPassword'],
    });
}

export type PasswordFormValues = z.infer<ReturnType<typeof createPasswordFormSchema>>;
