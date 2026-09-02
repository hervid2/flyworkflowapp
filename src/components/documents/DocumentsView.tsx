'use client';
/**
 * `/documentos` content: paginated list of document-type attachments across
 * every incident in the org, newest first. Real server-side pagination, same
 * query-param-driven pattern as `/galeria` and `/papelera`. Each row opens the
 * document in a new tab — there's no in-page preview like the gallery's
 * lightbox, since a browser can't render a Word file inline the way it can an image.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import type { GalleryMediaItem } from '@/domain/models';
import styles from './DocumentsView.module.scss';

interface Props {
  items: GalleryMediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function DocumentsView({ items, total, page, pageSize }: Props) {
  const t = useTranslations('documentos');
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`/documentos?${params.toString()}`);
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

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('columnDocument')}</th>
              <th className={styles.th}>{t('columnIncident')}</th>
              <th className={styles.th}>{t('columnProject')}</th>
              <th className={styles.th}>{t('columnSize')}</th>
              <th className={styles.th}>{t('columnDate')}</th>
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
              items.map((item) => (
                <tr key={item.id} className={styles.row}>
                  <td className={styles.td} data-label={t('columnDocument')}>
                    <div className={styles.docCell}>
                      <span className={styles.docCell__icon}>
                        <FileText size={16} />
                      </span>
                      <span className={styles.docCell__name}>{item.name}</span>
                      <span className={styles.docCell__format}>{item.format.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className={styles.td} data-label={t('columnIncident')}>
                    <span className={styles.id}>#{item.incident.sequenceId}</span>{' '}
                    <span className={styles.title}>{item.incident.title}</span>
                  </td>
                  <td className={styles.td} data-label={t('columnProject')}>
                    {item.incident.project.name}
                  </td>
                  <td className={styles.td} data-label={t('columnSize')}>
                    {formatFileSize(item.size)}
                  </td>
                  <td className={styles.td} data-label={t('columnDate')}>
                    {format(new Date(item.createdAt), "d MMM yyyy, HH:mm'h'", { locale: es })}
                  </td>
                  <td className={styles.td} data-label={t('columnActions')}>
                    <a
                      className={styles.openBtn}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('openAriaLabel', { name: item.name })}
                    >
                      <ExternalLink size={14} />
                      {t('openAction')}
                    </a>
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
