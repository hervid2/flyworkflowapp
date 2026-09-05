'use client';
/**
 * Dashboard top bar: breadcrumb, the period quick-switcher (7d…6m), and the
 * "Filters" / "Create incident" actions. Reads/writes the active period in the
 * filters store and opens modals via the modal store.
 */
import { useTranslations } from 'next-intl';
import { Filter, Plus, ChevronRight } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFiltersStore } from '@/store/useFiltersStore';
import { useModalStore } from '@/store/useModalStore';
import type { DashboardPeriod } from '@/domain/models/filters.model';
import ExportMenu from './ExportMenu';
import styles from './DashboardHeader.module.scss';

// Selectable period presets shown as the quick-switch buttons.
const PERIODS: { value: DashboardPeriod; labelKey: string }[] = [
  { value: '7d', labelKey: 'headerPeriod7d' },
  { value: '15d', labelKey: 'headerPeriod15d' },
  { value: '30d', labelKey: 'headerPeriod30d' },
  { value: '90d', labelKey: 'headerPeriod90d' },
  { value: '6m', labelKey: 'headerPeriod6m' },
];

/** Maps a period preset to a concrete date range (for the header label only). */
function getPeriodRange(period: DashboardPeriod): { from: Date; to: Date } {
  const to = startOfDay(new Date());
  if (period === '6m') {
    const from = new Date(to);
    from.setMonth(from.getMonth() - 6);
    return { from, to };
  }
  const daysMap: Record<string, number> = { '7d': 7, '15d': 15, '30d': 30, '90d': 90 };
  const days = daysMap[period] ?? 30;
  const from = subDays(to, days);
  return { from, to };
}

/** Human-readable "from – to" label for the currently selected period. */
function formatDateRange(period: DashboardPeriod): string {
  const { from, to } = getPeriodRange(period);
  const fromStr = format(from, "d 'de' MMM yyyy", { locale: es });
  const toStr = format(to, "d 'de' MMM yyyy", { locale: es });
  return `${fromStr} – ${toStr}`;
}

export default function DashboardHeader() {
  const t = useTranslations('dashboard');
  const period = useFiltersStore((s) => s.dashboardFilters.period);
  const setDashboardFilters = useFiltersStore((s) => s.setDashboardFilters);
  const openModal = useModalStore((s) => s.open);

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <nav className={styles.breadcrumb} aria-label={t('headerBreadcrumbAriaLabel')}>
          <span className={styles.breadcrumb__item}>{t('headerMyProjects')}</span>
          <ChevronRight size={14} className={styles.breadcrumb__sep} aria-hidden />
          <span className={styles.breadcrumb__item}>Proyecto Onboarding</span>
          <ChevronRight size={14} className={styles.breadcrumb__sep} aria-hidden />
          <span className={styles['breadcrumb__item--active']}>{t('headerIncidents')}</span>
        </nav>

        <div className={styles.actions}>
          <div className={styles.period}>
            {PERIODS.map(({ value, labelKey }) => (
              <button
                key={value}
                className={`${styles.period__btn} ${period === value ? styles['period__btn--active'] : ''}`}
                onClick={() => setDashboardFilters({ period: value })}
                aria-pressed={period === value}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          <button
            className={styles.btn}
            onClick={() => openModal('dashboard-filters')}
            aria-label={t('headerOpenFiltersAriaLabel')}
          >
            <Filter size={16} />
            <span>{t('headerFilters')}</span>
          </button>

          <ExportMenu />

          <button
            className={`${styles.btn} ${styles['btn--primary']}`}
            onClick={() => openModal('create-issue')}
            aria-label={t('headerCreateIncidentAriaLabel')}
          >
            <Plus size={16} />
            <span>{t('headerCreateIncident')}</span>
          </button>
        </div>
      </div>

      <div className={styles.meta}>
        <h1 className={styles.meta__title}>{t('headerIncidents')}</h1>
        {period !== 'custom' && (
          <span className={styles.meta__range} aria-label={t('headerDateRangeAriaLabel')}>
            {formatDateRange(period)}
          </span>
        )}
      </div>
    </header>
  );
}
