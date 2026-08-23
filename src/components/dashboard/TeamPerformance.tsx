'use client';
/**
 * Team performance panel: three ranked bar lists — top resolvers, top reporters
 * and current workload (with an overdue badge). Bars are normalized against the
 * column max so each list reads as a relative leaderboard.
 */
import { useTranslations } from 'next-intl';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import styles from './TeamPerformance.module.scss';

/** Round initials avatar derived from the user's name. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={styles.team__avatar} aria-hidden="true">
      {initials}
    </span>
  );
}

interface BarRowProps {
  name: string;
  value: number;
  max: number;
  label: string;
  variant?: 'gold' | 'blue' | 'red';
  badge?: number;
}

/** One leaderboard entry: avatar, accessible progress bar and count. */
function BarRow({ name, value, max, label, variant = 'gold', badge }: BarRowProps) {
  const t = useTranslations('dashboard');
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.team__row} role="listitem">
      <div className={styles.team__user}>
        <Avatar name={name} />
        <span className={styles.team__name} title={name}>
          {name.split(' ')[0]}
        </span>
      </div>
      <div
        className={styles.team__bar_track}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${name}: ${value} ${label}`}
      >
        <div
          className={`${styles.team__bar_fill} ${styles[`team__bar_fill--${variant}`]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.team__count_wrap}>
        <span className={styles.team__count}>{value}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={styles.team__overdue_badge}
            aria-label={t('teamOverdueBadgeAriaLabel', { count: badge })}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TeamPerformance() {
  const t = useTranslations('dashboard');
  const { team } = useDashboardMetrics();

  const maxClosed = Math.max(...team.resolvers.map((r) => r.closedCount), 1);
  const maxCreated = Math.max(...team.reporters.map((r) => r.createdCount), 1);
  const maxOpen = Math.max(...team.workload.map((r) => r.openCount), 1);

  return (
    <section className={styles.team} aria-labelledby="team-title">
      <h2 id="team-title" className={styles.team__title}>
        {t('teamTitle')}
      </h2>

      <div className={styles.team__columns}>
        <div className={styles.team__col} aria-label={t('teamTopResolversAriaLabel')}>
          <h3 className={styles.team__col_title}>{t('teamTopResolversTitle')}</h3>
          {team.resolvers.length === 0 ? (
            <p className={styles.team__empty}>{t('teamNoData')}</p>
          ) : (
            <div role="list">
              {team.resolvers.slice(0, 5).map((r) => (
                <BarRow
                  key={r.user.id}
                  name={r.user.name}
                  value={r.closedCount}
                  max={maxClosed}
                  label={t('teamClosedLabel')}
                  variant="gold"
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.team__col} aria-label={t('teamTopReportersAriaLabel')}>
          <h3 className={styles.team__col_title}>{t('teamTopReportersTitle')}</h3>
          {team.reporters.length === 0 ? (
            <p className={styles.team__empty}>{t('teamNoData')}</p>
          ) : (
            <div role="list">
              {team.reporters.slice(0, 5).map((r) => (
                <BarRow
                  key={r.user.id}
                  name={r.user.name}
                  value={r.createdCount}
                  max={maxCreated}
                  label={t('teamCreatedLabel')}
                  variant="blue"
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.team__col} aria-label={t('teamCurrentWorkloadAriaLabel')}>
          <h3 className={styles.team__col_title}>{t('teamCurrentWorkloadTitle')}</h3>
          {team.workload.length === 0 ? (
            <p className={styles.team__empty}>{t('teamNoData')}</p>
          ) : (
            <div role="list">
              {team.workload.slice(0, 5).map((r) => (
                <BarRow
                  key={r.user.id}
                  name={r.user.name}
                  value={r.openCount}
                  max={maxOpen}
                  label={t('teamOpenLabel')}
                  variant="red"
                  badge={r.overdueCount}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
