'use client';
/** Shown on `/historial` when the signed-in user isn't admin+ (backend returns 403 on `GET /audit-log`). */
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import styles from './HistorialForbidden.module.scss';

export default function HistorialForbidden() {
  const t = useTranslations('historial');

  return (
    <div className={styles.wrap} role="alert">
      <Lock size={32} className={styles.icon} aria-hidden />
      <p className={styles.title}>{t('forbiddenTitle')}</p>
      <p className={styles.message}>{t('forbiddenMessage')}</p>
    </div>
  );
}
