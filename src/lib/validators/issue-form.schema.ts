/**
 * Zod schema validating the create-incident form. Wired into React Hook Form
 * via `zodResolver`, it is the single source of validation rules and provides
 * the inferred {@link IssueFormValues} type used across the form components.
 */
import { z } from 'zod';

/** Local midnight, used to reject due dates earlier than the current day. */
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const issueFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es obligatorio')
    .max(120, 'El título no puede superar los 120 caracteres'),

  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(1000, 'La descripción no puede superar los 1000 caracteres'),

  dueDate: z
    .string()
    .min(1, 'La fecha de vencimiento es obligatoria')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date >= today();
    }, 'La fecha de vencimiento no puede ser anterior a hoy'),

  typeId: z.string().min(1, 'La categoría es obligatoria'),

  projectId: z.string().min(1, 'El proyecto es obligatorio'),

  priority: z.enum(['high', 'medium', 'low'], {
    error: () => ({ message: 'Selecciona una prioridad' }),
  }),

  tagIds: z.array(z.string()).optional(),

  assigneeIds: z.array(z.string()).optional(),

  observerIds: z.array(z.string()).optional(),

  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),

  locationDescription: z.string().max(500).nullable().optional(),
});

/** Strongly-typed form values inferred from the schema. */
export type IssueFormValues = z.infer<typeof issueFormSchema>;

/**
 * Minimal shape of the `next-intl` translator function this factory needs —
 * just enough to call `t('some.key')` for each validation message. Kept
 * decoupled from `next-intl`'s own types so this module (and its schema
 * builder) has no dependency on React or a client-only hook.
 */
type ValidationTranslator = (key: string) => string;

/**
 * Same validation rules as {@link issueFormSchema}, but every message is
 * sourced from `t()` instead of a hardcoded Spanish literal. Built per-render
 * from `useTranslations('validation')` in {@link IssueForm} so the active
 * locale drives the error copy; `issueFormSchema` itself stays untranslated
 * for callers (like tests) that need the schema without a component tree.
 */
export function createIssueFormSchema(t: ValidationTranslator) {
  return z.object({
    title: z.string().min(1, t('title.required')).max(120, t('title.max')),

    description: z.string().min(1, t('description.required')).max(1000, t('description.max')),

    dueDate: z
      .string()
      .min(1, t('dueDate.required'))
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date >= today();
      }, t('dueDate.pastOrInvalid')),

    typeId: z.string().min(1, t('typeId.required')),

    projectId: z.string().min(1, t('projectId.required')),

    priority: z.enum(['high', 'medium', 'low'], {
      error: () => ({ message: t('priority.invalid') }),
    }),

    tagIds: z.array(z.string()).optional(),

    assigneeIds: z.array(z.string()).optional(),

    observerIds: z.array(z.string()).optional(),

    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .nullable()
      .optional(),

    locationDescription: z.string().max(500).nullable().optional(),
  });
}
