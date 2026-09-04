/**
 * Zod schema for the `/invitar/[token]` accept-invitation form. Same
 * translator-factory pattern as `settings.schema.ts` — built per-render from
 * `useTranslations('invitar')` so error copy follows the active locale.
 */
import { z } from 'zod';

type InvitarTranslator = (key: string) => string;

export function createAcceptInvitationFormSchema(t: InvitarTranslator) {
  return z
    .object({
      name: z.string().min(1, t('nameRequired')).max(120, t('nameMax')),
      password: z.string().min(8, t('passwordMin')),
      confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordMismatch'),
      path: ['confirmPassword'],
    });
}

export type AcceptInvitationFormValues = z.infer<
  ReturnType<typeof createAcceptInvitationFormSchema>
>;
