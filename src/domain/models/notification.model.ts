/**
 * In-app notification domain model backing the TopBar bell (roadmap 8.7) —
 * one entry per `assignment`/`status_changed`/`approval` event the backend's
 * `NotificationsService.notify` recorded for the current user.
 */
export type AppNotificationType = 'assignment' | 'status_changed' | 'approval';

/** Lightweight incident reference embedded in a notification — enough to display without a per-row lookup. */
export interface NotificationIncidentRef {
  id: string;
  sequenceId: string;
  title: string;
  project: { id: string; name: string };
}

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  incident: NotificationIncidentRef;
  readAt: string | null;
  createdAt: string;
}
