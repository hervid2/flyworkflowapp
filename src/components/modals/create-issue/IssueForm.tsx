'use client';
/**
 * The create-incident form itself. Orchestrates React Hook Form + Zod validation
 * and the custom field widgets (tags, people, location, files), then maps the
 * form values to a {@link CreateIncidentDto}, calls the service and pushes the
 * resulting incident into the issues store.
 */
import { useMemo, useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useIssuesStore } from '@/store/useIssuesStore';
import { useModalStore } from '@/store/useModalStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { createIncident } from '@/services/create-incident.service';
import { createIssueFormSchema, type IssueFormValues } from '@/lib/validators/issue-form.schema';
import { INCIDENT_TYPES } from '@/lib/constants/incident-types';
import { PROJECTS } from '@/lib/constants/projects';
import { MOCK_USERS } from '@/lib/constants/mock-users';
import TagTreeSelect from './TagTreeSelect';
import UserMultiSelect from './UserMultiSelect';
import CategoryManagerModal from './CategoryManagerModal';
import LocationPicker from './LocationPicker';
import FileUploader from './FileUploader';
import type { Tag } from '@/domain/models';
import styles from './IssueForm.module.scss';

// Static demo data standing in for catalogs a backend would supply.
const MOCK_TAGS: Tag[] = [
  { id: '4bf3f690ae021229ec15f203', name: 'Reproceso', color: '#EF4444' },
  { id: '2a544044d7c705a56d0cf6c5', name: 'Acabados', color: '#6366F1' },
  { id: '86207f931475a6ec04908f00', name: 'Urgente', color: '#F59E0B' },
  { id: '95ef91272c28455168120ac3', name: 'Humedad', color: '#3B82F6' },
  { id: '132cd775ccc64acfd82582cc', name: 'Cliente', color: '#EC4899' },
  { id: 'a0314e3a97dac785a2dd5a6f', name: 'Seguridad', color: '#10B981' },
  { id: '835ac9eaf409e5d275108498', name: 'Calidad', color: '#8B5CF6' },
  { id: 'd1fa90ad0559f69ec34319e1', name: 'Garantía', color: '#14B8A6' },
];

const TODAY = format(new Date(), 'yyyy-MM-dd');

interface Props {
  onClose: () => void;
}

export default function IssueForm({ onClose }: Props) {
  const t = useTranslations('createIssue');
  const tValidation = useTranslations('validation');
  const schema = useMemo(() => createIssueFormSchema(tValidation), [tValidation]);
  const addIncident = useIssuesStore((s) => s.addIncident);
  const openModal = useModalStore((s) => s.open);
  const customTypes = useCategoriesStore((s) => s.customTypes);
  const authUser = useAuthStore((s) => s.user);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const typeCatalog = [...INCIDENT_TYPES, ...customTypes];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<IssueFormValues>({
    resolver: zodResolver(schema) as Resolver<IssueFormValues>,
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      typeId: '',
      projectId: '',
      priority: 'medium',
      tagIds: [],
      assigneeIds: [],
      observerIds: [],
      coordinates: null,
      locationDescription: null,
    },
  });

  const coordinates = watch('coordinates');
  const locationDescription = watch('locationDescription');

  // Resolve selected ids back to full objects, build the DTO, persist, reset.
  const onSubmit = async (data: IssueFormValues) => {
    const type = typeCatalog.find((t) => t.id === data.typeId)!;
    const project = PROJECTS.find((p) => p.id === data.projectId)!;
    const assignees = MOCK_USERS.filter((u) => (data.assigneeIds ?? []).includes(u.id));
    const observers = MOCK_USERS.filter((u) => (data.observerIds ?? []).includes(u.id));
    const tags = MOCK_TAGS.filter((t) => (data.tagIds ?? []).includes(t.id));

    const incident = await createIncident(
      {
        title: data.title,
        description: data.description,
        type,
        priority: data.priority,
        dueDate: data.dueDate,
        assignees,
        observers,
        tags,
        coordinates: data.coordinates ?? null,
        locationDescription: data.locationDescription ?? null,
        media: mediaFiles,
      },
      authUser!,
      project,
    );

    addIncident(incident);
    reset();
    setMediaFiles([]);
    onClose();
  };

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={t('form.ariaLabel')}
    >
      <div className={styles.body}>
        {/* ── Título ──────────────────────────────────────────────────────────── */}
        <div className={styles.field}>
          <label htmlFor="issue-title" className={`${styles.label} ${styles['label--required']}`}>
            {t('form.titleLabel')}
          </label>
          <input
            id="issue-title"
            type="text"
            className={`${styles.input} ${errors.title ? styles['input--error'] : ''}`}
            placeholder={t('form.titlePlaceholder')}
            aria-describedby={errors.title ? 'issue-title-error' : undefined}
            aria-invalid={!!errors.title}
            maxLength={120}
            {...register('title')}
          />
          {errors.title && (
            <p id="issue-title-error" className={styles.error} role="alert">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* ── Descripción ─────────────────────────────────────────────────────── */}
        <div className={styles.field}>
          <label
            htmlFor="issue-description"
            className={`${styles.label} ${styles['label--required']}`}
          >
            {t('form.descriptionLabel')}
          </label>
          <textarea
            id="issue-description"
            className={`${styles.textarea} ${errors.description ? styles['textarea--error'] : ''}`}
            placeholder={t('form.descriptionPlaceholder')}
            aria-describedby={errors.description ? 'issue-desc-error' : undefined}
            aria-invalid={!!errors.description}
            maxLength={1000}
            {...register('description')}
          />
          {errors.description && (
            <p id="issue-desc-error" className={styles.error} role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* ── Fecha de vencimiento ────────────────────────────────────────────── */}
        <div className={styles.field}>
          <label
            htmlFor="issue-due-date"
            className={`${styles.label} ${styles['label--required']}`}
          >
            {t('form.dueDateLabel')}
          </label>
          <input
            id="issue-due-date"
            type="date"
            className={`${styles.input} ${errors.dueDate ? styles['input--error'] : ''}`}
            min={TODAY}
            aria-describedby={errors.dueDate ? 'issue-due-error' : undefined}
            aria-invalid={!!errors.dueDate}
            {...register('dueDate')}
          />
          {errors.dueDate && (
            <p id="issue-due-error" className={styles.error} role="alert">
              {errors.dueDate.message}
            </p>
          )}
        </div>

        {/* ── Categoría ───────────────────────────────────────────────────────── */}
        <div className={styles.field}>
          <label htmlFor="issue-type" className={`${styles.label} ${styles['label--required']}`}>
            {t('form.categoryLabel')}
          </label>
          <div className={styles['field-row']}>
            <div className={styles.field}>
              <select
                id="issue-type"
                className={`${styles.select} ${errors.typeId ? styles['select--error'] : ''}`}
                aria-describedby={errors.typeId ? 'issue-type-error' : undefined}
                aria-invalid={!!errors.typeId}
                {...register('typeId')}
              >
                <option value="">{t('form.categoryPlaceholder')}</option>
                {typeCatalog.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.typeId && (
                <p id="issue-type-error" className={styles.error} role="alert">
                  {errors.typeId.message}
                </p>
              )}
            </div>
            <button
              type="button"
              className={styles['manage-btn']}
              onClick={() => openModal('category-manager')}
            >
              {t('form.manageCategoriesButton')}
            </button>
          </div>
        </div>

        {/* ── Proyecto ────────────────────────────────────────────────────────── */}
        <div className={styles.field}>
          <label htmlFor="issue-project" className={`${styles.label} ${styles['label--required']}`}>
            {t('form.projectLabel')}
          </label>
          <select
            id="issue-project"
            className={`${styles.select} ${errors.projectId ? styles['select--error'] : ''}`}
            aria-describedby={errors.projectId ? 'issue-project-error' : undefined}
            aria-invalid={!!errors.projectId}
            {...register('projectId')}
          >
            <option value="">{t('form.projectPlaceholder')}</option>
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.projectId && (
            <p id="issue-project-error" className={styles.error} role="alert">
              {errors.projectId.message}
            </p>
          )}
        </div>

        {/* ── Prioridad ───────────────────────────────────────────────────────── */}
        <div className={styles.field}>
          <label
            htmlFor="issue-priority"
            className={`${styles.label} ${styles['label--required']}`}
          >
            {t('form.priorityLabel')}
          </label>
          <select
            id="issue-priority"
            className={`${styles.select} ${errors.priority ? styles['select--error'] : ''}`}
            aria-invalid={!!errors.priority}
            {...register('priority')}
          >
            <option value="high">{t('form.priorityHigh')}</option>
            <option value="medium">{t('form.priorityMedium')}</option>
            <option value="low">{t('form.priorityLow')}</option>
          </select>
        </div>

        {/* ── Etiquetas ───────────────────────────────────────────────────────── */}
        <div className={styles.field}>
          <span className={styles.label}>{t('form.tagsLabel')}</span>
          <Controller
            name="tagIds"
            control={control}
            render={({ field }) => (
              <TagTreeSelect
                tags={MOCK_TAGS}
                selectedIds={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* ── Personas ────────────────────────────────────────────────────────── */}
        <p className={styles['section-label']}>{t('form.peopleSection')}</p>

        <div className={styles.field}>
          <span className={styles.label}>{t('form.assigneesLabel')}</span>
          <Controller
            name="assigneeIds"
            control={control}
            render={({ field }) => (
              <UserMultiSelect
                users={MOCK_USERS}
                selectedIds={field.value ?? []}
                onChange={field.onChange}
                placeholder={t('form.assigneesPlaceholder')}
                aria-label={t('form.assigneesAriaLabel')}
              />
            )}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{t('form.observersLabel')}</span>
          <Controller
            name="observerIds"
            control={control}
            render={({ field }) => (
              <UserMultiSelect
                users={MOCK_USERS}
                selectedIds={field.value ?? []}
                onChange={field.onChange}
                placeholder={t('form.observersPlaceholder')}
                aria-label={t('form.observersAriaLabel')}
              />
            )}
          />
        </div>

        {/* ── Ubicación ───────────────────────────────────────────────────────── */}
        <p className={styles['section-label']}>{t('form.locationSection')}</p>

        <div className={styles.field}>
          <LocationPicker
            value={coordinates ?? null}
            locationDescription={locationDescription ?? null}
            onChangeCoords={(coords) =>
              setValue('coordinates', coords, { shouldValidate: true, shouldDirty: true })
            }
            onChangeDescription={(desc) =>
              setValue('locationDescription', desc, { shouldDirty: true })
            }
          />
        </div>

        {/* ── Archivos adjuntos ────────────────────────────────────────────────── */}
        <p className={styles['section-label']}>{t('form.attachmentsSection')}</p>

        <div className={styles.field}>
          <FileUploader value={mediaFiles} onChange={setMediaFiles} />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <button type="button" className={styles['btn-cancel']} onClick={onClose}>
          {t('form.cancel')}
        </button>
        <button type="submit" className={styles['btn-submit']} disabled={isSubmitting}>
          {isSubmitting ? t('form.submitting') : t('form.submit')}
        </button>
      </div>

      {/* CategoryManagerModal se renderiza aquí (sub-modal) */}
      <CategoryManagerModal />
    </form>
  );
}
