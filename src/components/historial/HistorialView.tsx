'use client';
/**
 * `/historial` content: filterable, paginated audit trail. Unlike the
 * dashboard's `CriticalIssuesList` (which paginates client-side over a fully
 * preloaded collection), pagination and the project/user filters here are
 * real query params — each change navigates to a new `/historial?...` URL,
 * which re-runs the server component and re-fetches `GET /audit-log`.
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  RefreshCw,
  Check,
  X,
  Trash2,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { getProjects, getOrgMembers } from '@/services/catalogs.service';
import type { AuditAction, AuditLogEntry, Project, UserRef } from '@/domain/models';
import styles from './HistorialView.module.scss';

const ACTION_ICON: Record<AuditAction, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  status_changed: RefreshCw,
  approved: Check,
  rejected: X,
  deleted: Trash2,
  restored: RotateCcw,
};

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
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export default function HistorialView({ entries, total, page, pageSize }: Props) {
  const t = useTranslations('historial');
  const router = useRouter();
  const searchParams = useSearchParams();
  const authHydrated = useAuthStore((s) => s.hydrated);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<UserRef[]>([]);

  useEffect(() => {
    if (!authHydrated) return;
    let cancelled = false;
    Promise.all([getProjects(), getOrgMembers()]).then(([p, m]) => {
      if (!cancelled) {
        setProjects(p);
        setMembers(m);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authHydrated]);

  const projectId = searchParams.get('projectId') ?? '';
  const userId = searchParams.get('userId') ?? '';
  const hasFilters = Boolean(projectId || userId);

  function navigate(next: { page?: number; projectId?: string; userId?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextProjectId = next.projectId ?? projectId;
    const nextUserId = next.userId ?? userId;

    if (nextProjectId) params.set('projectId', nextProjectId);
    else params.delete('projectId');

    if (nextUserId) params.set('userId', nextUserId);
    else params.delete('userId');

    params.set('page', String(next.page ?? 1));
    router.push(`/historial?${params.toString()}`);
  }

  const ACTION_LABELS: Record<AuditAction, string> = {
    created: t('actionCreated'),
    updated: t('actionUpdated'),
    status_changed: t('actionStatusChanged'),
    approved: t('actionApproved'),
    rejected: t('actionRejected'),
    deleted: t('actionDeleted'),
    restored: t('actionRestored'),
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className={styles.section} aria-label={t('sectionAriaLabel')}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.header__title}>{t('pageTitle')}</h1>
          <p className={styles.header__subtitle}>{t('pageSubtitle')}</p>
        </div>
      </div>

      <div className={styles.filters} role="search" aria-label={t('filtersAriaLabel')}>
        <label className={styles.filterField}>
          <span className={styles.filterField__label}>{t('filterProjectLabel')}</span>
          <select
            className={styles.select}
            value={projectId}
            onChange={(e) => navigate({ projectId: e.target.value })}
          >
            <option value="">{t('filterProjectAll')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterField__label}>{t('filterUserLabel')}</span>
          <select
            className={styles.select}
            value={userId}
            onChange={(e) => navigate({ userId: e.target.value })}
          >
            <option value="">{t('filterUserAll')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => navigate({ projectId: '', userId: '' })}
          >
            {t('filterClear')}
          </button>
        )}

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

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('columnAction')}</th>
              <th className={styles.th}>{t('columnIncident')}</th>
              <th className={styles.th}>{t('columnProject')}</th>
              <th className={styles.th}>{t('columnActor')}</th>
              <th className={styles.th}>{t('columnDate')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {t('emptyTable')}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const ActionIcon = ACTION_ICON[entry.action];
                return (
                  <tr key={entry.id} className={styles.row}>
                    <td className={styles.td} data-label={t('columnAction')}>
                      <span
                        className={`${styles.actionBadge} ${styles[`actionBadge--${entry.action}`]}`}
                      >
                        <ActionIcon size={12} />
                        {ACTION_LABELS[entry.action]}
                      </span>
                    </td>
                    <td className={styles.td} data-label={t('columnIncident')}>
                      <span className={styles.id}>#{entry.incident.sequenceId}</span>{' '}
                      <span className={styles.title}>{entry.incident.title}</span>
                    </td>
                    <td className={styles.td} data-label={t('columnProject')}>
                      {entry.incident.project.name}
                    </td>
                    <td className={styles.td} data-label={t('columnActor')}>
                      <div className={styles.actorCell}>
                        <UserAvatar name={entry.actor.name} avatarUrl={entry.actor.avatarUrl} />
                        <span className={styles.actorCell__name}>{entry.actor.name}</span>
                      </div>
                    </td>
                    <td className={styles.td} data-label={t('columnDate')}>
                      {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm'h'", { locale: es })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination} role="navigation" aria-label={t('paginationAriaLabel')}>
        <button
          className={styles.pagination__btn}
          onClick={() => navigate({ page: page - 1 })}
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
          onClick={() => navigate({ page: page + 1 })}
          disabled={page >= totalPages}
          aria-label={t('nextPageAriaLabel')}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
