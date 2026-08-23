'use client';
/**
 * Advanced dashboard filters modal. Edits a local draft of the filter set
 * (period, status, priority, user/company) and only commits it to the filters
 * store on "Apply", so the dashboard doesn't re-render on every keystroke.
 */
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import { useFiltersStore } from '@/store/useFiltersStore';
import type { DashboardFilters, DashboardPeriod } from '@/domain/models/filters.model';
import type { IncidentStatus, IncidentPriority } from '@/domain/models/incident.model';
import { MOCK_USERS } from '@/lib/constants/mock-users';
import styles from './DashboardFiltersModal.module.scss';

const PERIODS: { value: DashboardPeriod; labelKey: string }[] = [
  { value: '7d', labelKey: 'filtersModalPeriod7d' },
  { value: '15d', labelKey: 'filtersModalPeriod15d' },
  { value: '30d', labelKey: 'filtersModalPeriod30d' },
  { value: '90d', labelKey: 'filtersModalPeriod90d' },
  { value: '6m', labelKey: 'filtersModalPeriod6m' },
];

const STATUSES: { value: IncidentStatus; labelKey: string }[] = [
  { value: 'open', labelKey: 'statusOpen' },
  { value: 'on_pause', labelKey: 'statusOnPause' },
  { value: 'closed', labelKey: 'statusClosed' },
];

const PRIORITIES: { value: IncidentPriority; labelKey: string }[] = [
  { value: 'high', labelKey: 'priorityHigh' },
  { value: 'medium', labelKey: 'priorityMedium' },
  { value: 'low', labelKey: 'priorityLow' },
];

const COMPANIES = Array.from(new Set(MOCK_USERS.map((u) => u.company)));

function toggle<T>(arr: T[] | undefined, item: T): T[] {
  const current = arr ?? [];
  return current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
}

/** Reusable row of toggleable chips for a single multi-select filter. */
function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[] | undefined;
  onToggle: (v: T) => void;
}) {
  return (
    <div className={styles.chipGroup}>
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`${styles.chip} ${selected?.includes(value) ? styles['chip--active'] : ''}`}
          onClick={() => onToggle(value)}
          aria-pressed={selected?.includes(value) ?? false}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardFiltersModal() {
  const t = useTranslations('dashboard');
  const activeModal = useModalStore((s) => s.activeModal);
  const closeModal = useModalStore((s) => s.close);
  const dashboardFilters = useFiltersStore((s) => s.dashboardFilters);
  const setDashboardFilters = useFiltersStore((s) => s.setDashboardFilters);
  const resetDashboardFilters = useFiltersStore((s) => s.resetDashboardFilters);

  const [draft, setDraft] = useState<DashboardFilters>(dashboardFilters);

  useEffect(() => {
    if (activeModal === 'dashboard-filters') {
      setDraft(dashboardFilters);
    }
  }, [activeModal, dashboardFilters]);

  if (activeModal !== 'dashboard-filters') return null;

  function handleApply() {
    setDashboardFilters(draft);
    closeModal();
  }

  function handleReset() {
    resetDashboardFilters();
    closeModal();
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-label={t('filtersModalOverlayAriaLabel')}
    >
      <div className={styles.modal}>
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>{t('filtersModalTitle')}</h2>
          <button
            className={styles.modal__close}
            onClick={closeModal}
            aria-label={t('filtersModalCloseAriaLabel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modal__body}>
          <fieldset className={styles.field}>
            <legend className={styles.field__label}>{t('filtersModalLegendPeriod')}</legend>
            <ChipGroup
              options={PERIODS.map((p) => ({ value: p.value, label: t(p.labelKey) }))}
              selected={[draft.period]}
              onToggle={(v) => setDraft((d) => ({ ...d, period: v }))}
            />
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.field__label}>{t('filtersModalLegendStatus')}</legend>
            <ChipGroup
              options={STATUSES.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
              selected={draft.status}
              onToggle={(v) => setDraft((d) => ({ ...d, status: toggle(d.status, v) }))}
            />
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.field__label}>{t('filtersModalLegendPriority')}</legend>
            <ChipGroup
              options={PRIORITIES.map((p) => ({ value: p.value, label: t(p.labelKey) }))}
              selected={draft.priority}
              onToggle={(v) => setDraft((d) => ({ ...d, priority: toggle(d.priority, v) }))}
            />
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.field__label}>
              {t('filtersModalLegendCreatedByCompany')}
            </legend>
            <ChipGroup
              options={COMPANIES.map((c) => ({ value: c, label: c }))}
              selected={draft.createdByCompany}
              onToggle={(v) =>
                setDraft((d) => ({ ...d, createdByCompany: toggle(d.createdByCompany, v) }))
              }
            />
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.field__label}>{t('filtersModalLegendCreatedByUser')}</legend>
            <div className={styles.userList}>
              {MOCK_USERS.map((u) => {
                const active = draft.createdByUser?.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`${styles.userChip} ${active ? styles['userChip--active'] : ''}`}
                    onClick={() =>
                      setDraft((d) => ({ ...d, createdByUser: toggle(d.createdByUser, u.id) }))
                    }
                    aria-pressed={active ?? false}
                  >
                    <span className={styles.userChip__avatar}>{u.name.charAt(0)}</span>
                    <span className={styles.userChip__name}>{u.name}</span>
                    <span className={styles.userChip__company}>{u.company}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.field__label}>
              {t('filtersModalLegendResponsibleByCompany')}
            </legend>
            <ChipGroup
              options={COMPANIES.map((c) => ({ value: c, label: c }))}
              selected={draft.responsibleByCompany}
              onToggle={(v) =>
                setDraft((d) => ({
                  ...d,
                  responsibleByCompany: toggle(d.responsibleByCompany, v),
                }))
              }
            />
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.field__label}>
              {t('filtersModalLegendResponsibleByUser')}
            </legend>
            <div className={styles.userList}>
              {MOCK_USERS.map((u) => {
                const active = draft.responsibleUser?.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`${styles.userChip} ${active ? styles['userChip--active'] : ''}`}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        responsibleUser: toggle(d.responsibleUser, u.id),
                      }))
                    }
                    aria-pressed={active ?? false}
                  >
                    <span className={styles.userChip__avatar}>{u.name.charAt(0)}</span>
                    <span className={styles.userChip__name}>{u.name}</span>
                    <span className={styles.userChip__company}>{u.company}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className={styles.modal__footer}>
          <button type="button" className={styles.btnSecondary} onClick={handleReset}>
            {t('filtersModalClearFilters')}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleApply}>
            {t('filtersModalApply')}
          </button>
        </div>
      </div>
    </div>
  );
}
