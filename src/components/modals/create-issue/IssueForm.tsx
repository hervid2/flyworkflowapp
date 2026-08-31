'use client';
/**
 * The create-incident form itself. Orchestrates React Hook Form + Zod validation
 * and the custom field widgets (tags, people, location, files), then maps the
 * form values to a {@link CreateIncidentDto}, calls the service and pushes the
 * resulting incident into the issues store. Reference data (types, projects,
 * tags, teammates) is fetched from the real backend when the form mounts —
 * it's unmounted/remounted every time the modal opens (CreateIssueModal.tsx),
 * so this stays reasonably fresh without needing its own cache invalidation.
 */
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useIssuesStore } from '@/store/useIssuesStore';
import { useModalStore } from '@/store/useModalStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { createIncident } from '@/services/incident-mutations.service';
import { getIncidentTypes, getProjects, getTags, getOrgMembers } from '@/services/catalogs.service';
import { createIssueFormSchema, type IssueFormValues } from '@/lib/validators/issue-form.schema';
import TagTreeSelect from './TagTreeSelect';
import UserMultiSelect from './UserMultiSelect';
import CategoryManagerModal from './CategoryManagerModal';
import LocationPicker from './LocationPicker';
import FileUploader from './FileUploader';
import type { IncidentType, Project, Tag, UserRef } from '@/domain/models';
import styles from './IssueForm.module.scss';

const TODAY = format(new Date(), 'yyyy-MM-dd');

interface Catalogs {
  types: IncidentType[];
  projects: Project[];
  tags: Tag[];
  members: UserRef[];
}

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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [catalogsError, setCatalogsError] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getIncidentTypes(), getProjects(), getTags(), getOrgMembers()])
      .then(([types, projects, tags, members]) => {
        if (!cancelled) setCatalogs({ types, projects, tags, members });
      })
      .catch(() => {
        if (!cancelled) setCatalogsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeCatalog = [...(catalogs?.types ?? []), ...customTypes];

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
    if (!catalogs) return;
    setSubmitError(false);

    const type = typeCatalog.find((ty) => ty.id === data.typeId)!;
    const project = catalogs.projects.find((p) => p.id === data.projectId)!;
    const assignees = catalogs.members.filter((u) => (data.assigneeIds ?? []).includes(u.id));
    const observers = catalogs.members.filter((u) => (data.observerIds ?? []).includes(u.id));
    const tags = catalogs.tags.filter((tg) => (data.tagIds ?? []).includes(tg.id));

    try {
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
          // Attachments upload directly to S3 after creation (roadmap F7.3) —
          // not sent as part of this request.
          media: mediaFiles,
        },
        project,
      );

      addIncident(incident);
      reset();
      setMediaFiles([]);
      onClose();
    } catch {
      setSubmitError(true);
    }
  };

  if (catalogsError) {
    return (
      <div className={styles.body}>
        <p className={styles.error} role="alert">
          {t('form.catalogsError')}
        </p>
      </div>
    );
  }

  if (!catalogs) {
    return (
      <div className={styles.body}>
        <p aria-live="polite">{t('form.loadingCatalogs')}</p>
      </div>
    );
  }

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
                {typeCatalog.map((ty) => (
                  <option key={ty.id} value={ty.id}>
                    {ty.name}
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
            {catalogs.projects.map((p) => (
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
                tags={catalogs.tags}
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
                users={catalogs.members}
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
                users={catalogs.members}
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

        {submitError && (
          <p className={styles.error} role="alert" aria-live="assertive">
            {t('form.submitError')}
          </p>
        )}
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
