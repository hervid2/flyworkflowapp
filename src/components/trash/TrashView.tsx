'use client';
/**
 * `/papelera` content: paginated list of soft-deleted incidents with a
 * restore action per row. Like `HistorialView`, pagination is a real query
 * param — each page change navigates to a new `/papelera?...` URL, which
 * re-runs the server component and re-fetches `GET /incidents/trash`.
 * Restore is optimistic: on a successful `POST /incidents/:id/restore` the
 * row is dropped from local state immediately instead of waiting on a
 * server refetch (it no longer belongs on this page once restored).
 */
import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { restoreIncident } from '@/services/incident-mutations.service';
import type { Incident } from '@/domain/models';
import styles from './TrashView.module.scss';

/** Avatar image with a graceful initials fallback when the URL fails to load. */
function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  if (avatarUrl && !imgError) {
    return (
      <span className={styles.avatarWrap} title={name}>
        <Image
          src={avatarUrl}
          alt={name}
          width={26}
          height={26}
          className={styles.avatarImg}
          onError={() => setImgError(true)}
        />
      </span>
    );
  }
  return (
    <span className={styles.avatarWrap} title={name}>
      <span className={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
    </span>
  );
}

interface Props {
  incidents: Incident[];
  total: number;
  page: number;
  pageSize: number;
}

export default function TrashView({ incidents, total: initialTotal, page, pageSize }: Props) {
  const t = useTranslations('papelera');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState(incidents);
  // Tracked locally (not just `items.length`) so the "x–y of total" count and
  // pagination stay correct even though a restored row leaves this page's
  // `items` short of a full `pageSize` without re-fetching the next page.
  const [total, setTotal] = useState(initialTotal);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const PRIORITY_LABELS: Record<string, string> = {
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow'),
  };

  function navigate(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`/papelera?${params.toString()}`);
  }

  async function handleRestore(incident: Incident) {
    setError('');
    setPendingId(incident.id);
    try {
      await restoreIncident(incident.id);
      setItems((prev) => prev.filter((i) => i.id !== incident.id));
      setTotal((prev) => prev - 1);
    } catch {
      setError(t('restoreError'));
    } finally {
      setPendingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className={styles.section} aria-label={t('sectionAriaLabel')}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.header__title}>{t('pageTitle')}</h1>
          <p className={styles.header__subtitle}>{t('pageSubtitle')}</p>
        </div>
        <p className={styles.header__count}>
          {total === 0
            ? t('resultsEmpty')
            : t('resultsRange', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
        </p>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('columnIncident')}</th>
              <th className={styles.th}>{t('columnProject')}</th>
              <th className={styles.th}>{t('columnPriority')}</th>
              <th className={styles.th}>{t('columnOwner')}</th>
              <th className={styles.th}>{t('columnDeletedAt')}</th>
              <th className={styles.th}>{t('columnActions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {t('emptyTable')}
                </td>
              </tr>
            ) : (
              items.map((incident) => (
                <tr key={incident.id} className={styles.row}>
                  <td className={styles.td} data-label={t('columnIncident')}>
                    <span className={styles.id}>#{incident.sequenceId}</span>{' '}
                    <span className={styles.title}>{incident.title}</span>
                  </td>
                  <td className={styles.td} data-label={t('columnProject')}>
                    {incident.project.name}
                  </td>
                  <td className={styles.td} data-label={t('columnPriority')}>
                    <span
                      className={`${styles.priority} ${styles[`priority--${incident.priority}`]}`}
                    >
                      {PRIORITY_LABELS[incident.priority]}
                    </span>
                  </td>
                  <td className={styles.td} data-label={t('columnOwner')}>
                    <div className={styles.ownerCell}>
                      <UserAvatar name={incident.owner.name} avatarUrl={incident.owner.avatarUrl} />
                      <span className={styles.ownerCell__name}>{incident.owner.name}</span>
                    </div>
                  </td>
                  <td className={styles.td} data-label={t('columnDeletedAt')}>
                    {format(new Date(incident.updatedAt), "d MMM yyyy, HH:mm'h'", { locale: es })}
                  </td>
                  <td className={styles.td} data-label={t('columnActions')}>
                    <button
                      type="button"
                      className={styles.restoreBtn}
                      onClick={() => handleRestore(incident)}
                      disabled={pendingId === incident.id}
                      aria-label={t('restoreAriaLabel', { title: incident.title })}
                    >
                      <RotateCcw size={14} />
                      {pendingId === incident.id ? t('restoring') : t('restoreAction')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination} role="navigation" aria-label={t('paginationAriaLabel')}>
        <button
          className={styles.pagination__btn}
          onClick={() => navigate(page - 1)}
          disabled={page <= 1}
          aria-label={t('prevPageAriaLabel')}
        >
          <ChevronLeft size={16} />
        </button>
        <span className={styles.pagination__info}>
          {page} / {totalPages}
        </span>
        <button
          className={styles.pagination__btn}
          onClick={() => navigate(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('nextPageAriaLabel')}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
