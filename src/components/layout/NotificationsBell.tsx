'use client';
/**
 * TopBar notification bell (roadmap 8.7): polls `GET /notifications` on a
 * simple interval (requirements.md §1.5 — "simple polling, no WebSocket"),
 * shows an unread badge and a dropdown feed. Clicking an item marks it read
 * and opens the related incident via the shared `useIncidentDetailStore` +
 * `IncidentDetailModal` — that modal only mounts on /dashboard, /mapa and
 * /calendario, so a click routes to /dashboard first (it loads every
 * non-deleted incident in the org, so the id can always resolve there).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, UserPlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationsStore, selectUnreadCount } from '@/store/useNotificationsStore';
import { useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { getNotifications, markNotificationRead } from '@/services/notifications.service';
import type { AppNotification, AppNotificationType } from '@/domain/models';
import styles from './NotificationsBell.module.scss';

const POLL_INTERVAL_MS = 30_000;

const TYPE_ICON: Record<AppNotificationType, typeof Bell> = {
  assignment: UserPlus,
  status_changed: RefreshCw,
  approval: ShieldCheck,
};

const TYPE_MESSAGE_KEY: Record<AppNotificationType, string> = {
  assignment: 'notificationAssignment',
  status_changed: 'notificationStatusChanged',
  approval: 'notificationApproval',
};

export default function NotificationsBell() {
  const t = useTranslations('topbar');
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const items = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore(selectUnreadCount);
  const setInitial = useNotificationsStore((s) => s.setInitial);
  const prepend = useNotificationsStore((s) => s.prepend);
  const markReadInStore = useNotificationsStore((s) => s.markRead);
  const openDetail = useIncidentDetailStore((s) => s.openDetail);
  const [open, setOpen] = useState(false);
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

  // Polls once on login, then on a fixed interval; keeps running across
  // client-side navigation since TopBar lives in the persistent app layout.
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;

    let cancelled = false;
    let isFirstLoad = true;
    let sinceCursor: string | undefined;

    async function poll() {
      try {
        const fresh = await getNotifications(sinceCursor);
        if (cancelled) return;
        if (fresh.length > 0) sinceCursor = fresh[0].createdAt;
        if (isFirstLoad) {
          setInitial(fresh);
          isFirstLoad = false;
        } else if (fresh.length > 0) {
          prepend(fresh);
        }
      } catch {
        // Best-effort: a failed poll just retries on the next interval.
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hydrated, isAuthenticated, setInitial, prepend]);

  function handleItemClick(notification: AppNotification) {
    if (!notification.readAt) {
      markReadInStore(notification.id);
      markNotificationRead(notification.id).catch(() => {
        // Optimistic — a failed PATCH just means the next poll won't hide it either.
      });
    }
    openDetail(notification.incident.id);
    setOpen(false);
    if (pathname !== '/dashboard') router.push('/dashboard');
  }

  return (
    <div className={styles.bell} ref={panelRef}>
      <button
        type="button"
        className={styles.bell__trigger}
        aria-label={
          unreadCount > 0 ? t('notificationsUnread', { count: unreadCount }) : t('notifications')
        }
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={16} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className={styles.bell__badge} aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.bell__panel} role="menu" aria-label={t('notifications')}>
          <div className={styles.bell__header}>{t('notifications')}</div>
          {items.length === 0 ? (
            <p className={styles.bell__empty}>{t('notificationsEmpty')}</p>
          ) : (
            <ul className={styles.bell__list}>
              {items.map((notification) => {
                const Icon = TYPE_ICON[notification.type];
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.bell__item}
                      data-unread={!notification.readAt}
                      onClick={() => handleItemClick(notification)}
                    >
                      <Icon
                        size={14}
                        aria-hidden="true"
                        className={styles[`bell__icon--${notification.type}`]}
                      />
                      <span className={styles.bell__itemBody}>
                        <span className={styles.bell__itemText}>
                          {t(TYPE_MESSAGE_KEY[notification.type], {
                            sequenceId: notification.incident.sequenceId,
                            title: notification.incident.title,
                          })}
                        </span>
                        <span className={styles.bell__itemTime}>
                          {formatDistanceToNow(parseISO(notification.createdAt), {
                            locale: es,
                            addSuffix: true,
                          })}
                        </span>
                      </span>
                      {!notification.readAt && (
                        <span className={styles.bell__dot} aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
