'use client';
/**
 * Row of headline KPI cards (open, created, closed, closure rate, avg
 * resolution, overdue). Reads pre-computed values from the metrics hook and
 * presents them with accent colors and trend arrows — display-only.
 */
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import styles from './KeyMetricsRow.module.scss';

/** Single KPI tile: label, value and optional trend-annotated subtitle. */
function MetricCard({
  label,
  value,
  sub,
  accent,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <article className={styles.card} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={styles.card__accent} aria-hidden />
      <div className={styles.card__body}>
        <p className={styles.card__label}>{label}</p>
        <p className={styles.card__value}>{value}</p>
        {sub && (
          <p className={styles.card__sub}>
            {trend === 'up' && <TrendingUp size={12} aria-hidden />}
            {trend === 'down' && <TrendingDown size={12} aria-hidden />}
            {trend === 'neutral' && <Minus size={12} aria-hidden />}
            <span>{sub}</span>
          </p>
        )}
      </div>
    </article>
  );
}

export default function KeyMetricsRow() {
  const t = useTranslations('dashboard');
  const m = useDashboardMetrics();

  const resolutionLabel = m.avgResolutionDays === null ? '—' : `${m.avgResolutionDays}d`;

  return (
    <section className={styles.row} aria-label={t('metricsSectionAriaLabel')}>
      <MetricCard
        label={t('metricsOpen')}
        value={m.openCount}
        accent="var(--color-status-open, #34C759)"
      />
      <MetricCard
        label={t('metricsCreatedInPeriod')}
        value={m.createdInPeriod}
        accent="var(--color-info-blue, #3B82F6)"
      />
      <MetricCard
        label={t('metricsClosedInPeriod')}
        value={m.closedInPeriod}
        accent={
          m.closedInPeriod > 0
            ? 'var(--color-status-open, #34C759)'
            : 'var(--color-status-closed, #E5484D)'
        }
      />
      <MetricCard
        label={t('metricsClosureRate')}
        value={`${m.closureRate}%`}
        sub={m.closureRate >= 50 ? t('metricsGoodPace') : t('metricsNeedsImprovement')}
        trend={m.closureRate >= 50 ? 'up' : 'down'}
        accent="var(--color-accent-gold, #F2B705)"
      />
      <MetricCard
        label={t('metricsAvgResolutionTime')}
        value={resolutionLabel}
        sub={m.avgResolutionDays !== null ? t('metricsAvgResolutionSub') : t('metricsNoDataSub')}
        accent="var(--color-info-blue, #3B82F6)"
      />
      <MetricCard
        label={t('metricsOverdueActive')}
        value={m.overdueActiveCount}
        sub={m.overdueActiveCount > 0 ? t('metricsNeedsAttention') : t('metricsUpToDate')}
        trend={m.overdueActiveCount > 0 ? 'down' : 'neutral'}
        accent="var(--color-status-closed, #E5484D)"
      />
    </section>
  );
}
