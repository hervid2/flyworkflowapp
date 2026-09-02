'use client';
/** Generic "you don't have permission" state for a page whose backend route is role-gated. */
import { Lock } from 'lucide-react';
import styles from './AccessRestricted.module.scss';

interface Props {
  title: string;
  message: string;
}

export default function AccessRestricted({ title, message }: Props) {
  return (
    <div className={styles.wrap} role="alert">
      <Lock size={32} className={styles.icon} aria-hidden />
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
