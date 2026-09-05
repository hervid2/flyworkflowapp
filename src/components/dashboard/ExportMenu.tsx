'use client';
/**
 * Dashboard "Export" action (roadmap 8.10, requirements.md §1.10): a small
 * dropdown next to Filters/Create Incident with three actions — download the
 * currently filtered incidents as CSV, download the dashboard KPIs as CSV,
 * and open the "Export and connect" modal (stable data-token URL for Power
 * BI/Looker Studio). The two CSV downloads run entirely client-side (the
 * dashboard already holds every org incident — see incidents.service.ts's
 * own comment on that architecture); only "connect" talks to the backend.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, ChevronDown, Link2 } from 'lucide-react';
import { useIssuesStore } from '@/store/useIssuesStore';
import { useFiltersStore } from '@/store/useFiltersStore';
import { useModalStore } from '@/store/useModalStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { filterIncidentsByDashboardFilters } from '@/domain/selectors/dashboard-metrics.selector';
import { fetchIncidentsCsv } from '@/services/reports.service';
import { toCsv, downloadCsv, downloadBlob, type CsvColumn } from '@/lib/csv';
import type { Incident } from '@/domain/models/incident.model';
import type { DashboardMetrics } from '@/domain/models/dashboard-metrics.model';
import styles from './ExportMenu.module.scss';

const INCIDENT_COLUMNS: CsvColumn<Incident>[] = [
  { header: 'id', value: (i) => i.sequenceId },
  { header: 'title', value: (i) => i.title },
  { header: 'type', value: (i) => i.type.name },
  { header: 'status', value: (i) => i.status },
  { header: 'priority', value: (i) => i.priority },
  { header: 'project', value: (i) => i.project?.name ?? '' },
  { header: 'owner', value: (i) => i.owner?.name ?? '' },
  { header: 'assignees', value: (i) => i.assignees.map((a) => a.name).join('; ') },
  { header: 'createdAt', value: (i) => i.createdAt },
  { header: 'dueDate', value: (i) => i.dueDate ?? '' },
  { header: 'closingDate', value: (i) => i.closingDate ?? '' },
];

type MetricsCsvRow = { dimension: string; key: string; value: number | string };

const METRICS_COLUMNS: CsvColumn<MetricsCsvRow>[] = [
  { header: 'dimension', value: (r) => r.dimension },
  { header: 'key', value: (r) => r.key },
  { header: 'value', value: (r) => r.value },
];

/** Flattens {@link DashboardMetrics} into tidy (dimension, key, value) rows — easy to pivot in a spreadsheet. */
function metricsToRows(metrics: DashboardMetrics): MetricsCsvRow[] {
  return [
    { dimension: 'summary', key: 'openCount', value: metrics.openCount },
    { dimension: 'summary', key: 'createdInPeriod', value: metrics.createdInPeriod },
    { dimension: 'summary', key: 'closedInPeriod', value: metrics.closedInPeriod },
    { dimension: 'summary', key: 'closureRatePercent', value: metrics.closureRate },
    { dimension: 'summary', key: 'avgResolutionDays', value: metrics.avgResolutionDays ?? '' },
    { dimension: 'summary', key: 'overdueActiveCount', value: metrics.overdueActiveCount },
    ...metrics.byStatus.map((s) => ({ dimension: 'status', key: s.status, value: s.count })),
    ...metrics.byPriority.map((p) => ({
      dimension: 'priority',
      key: p.priority,
      value: p.count,
    })),
    ...metrics.byType.map((t) => ({ dimension: 'type', key: t.typeKey, value: t.count })),
    { dimension: 'risk', key: 'overdueToday', value: metrics.risk.overdueToday },
    { dimension: 'risk', key: 'staleSince7d', value: metrics.risk.staleSince7d },
    { dimension: 'risk', key: 'highPriorityOpen', value: metrics.risk.highPriorityOpen },
    { dimension: 'risk', key: 'dueWithin7d', value: metrics.risk.dueWithin7d },
  ];
}

export default function ExportMenu() {
  const t = useTranslations('dashboard');
  const incidents = useIssuesStore((s) => s.incidents);
  const dashboardFilters = useFiltersStore((s) => s.dashboardFilters);
  const metrics = useDashboardMetrics();
  const openModal = useModalStore((s) => s.open);

  const [open, setOpen] = useState(false);
  const [downloadingIncidents, setDownloadingIncidents] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleDownloadIncidents() {
    setError('');
    setDownloadingIncidents(true);
    try {
      // The backend export doesn't know about the dashboard-only
      // createdByUser/responsibleUser filters, so when either is active we
      // export client-side instead, matching exactly what's on screen.
      if (dashboardFilters.createdByUser?.length || dashboardFilters.responsibleUser?.length) {
        const filtered = filterIncidentsByDashboardFilters(incidents, dashboardFilters);
        downloadCsv('incidencias.csv', toCsv(filtered, INCIDENT_COLUMNS));
      } else {
        const blob = await fetchIncidentsCsv({
          status: dashboardFilters.status,
          priority: dashboardFilters.priority,
          typeKey: dashboardFilters.typeKey,
        });
        downloadBlob('incidencias.csv', blob);
      }
      setOpen(false);
    } catch {
      setError(t('exportErrorGeneric'));
    } finally {
      setDownloadingIncidents(false);
    }
  }

  function handleDownloadMetrics() {
    setError('');
    downloadCsv('metricas-dashboard.csv', toCsv(metricsToRows(metrics), METRICS_COLUMNS));
    setOpen(false);
  }

  function handleOpenConnect() {
    setOpen(false);
    openModal('export-connect');
  }

  return (
    <div className={styles.menu} ref={panelRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('exportMenuAriaLabel')}
      >
        <Download size={16} />
        <span>{t('exportMenuTrigger')}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <div className={styles.panel} role="menu" aria-label={t('exportMenuAriaLabel')}>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => void handleDownloadIncidents()}
            disabled={downloadingIncidents}
          >
            {t('exportIncidentsCsv')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={handleDownloadMetrics}
          >
            {t('exportMetricsCsv')}
          </button>
          <div className={styles.divider} role="separator" />
          <button type="button" role="menuitem" className={styles.item} onClick={handleOpenConnect}>
            <Link2 size={14} aria-hidden />
            <span>{t('exportConnectMenuItem')}</span>
          </button>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
