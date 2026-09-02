import type { NotificationType } from '@prisma/client';

/** Lightweight incident reference embedded in a notification — mirrors audit-log's/media's incident ref, enough to display without a per-row lookup. */
export interface NotificationIncidentRefDto {
  id: string;
  sequenceId: string;
  title: string;
  project: { id: string; name: string };
}

export class NotificationResponseDto {
  id!: string;
  type!: NotificationType;
  incident!: NotificationIncidentRefDto;
  readAt!: Date | null;
  createdAt!: Date;
}

export function toNotificationResponseDto(notification: {
  id: string;
  type: NotificationType;
  incident: NotificationIncidentRefDto;
  readAt: Date | null;
  createdAt: Date;
}): NotificationResponseDto {
  return {
    id: notification.id,
    type: notification.type,
    incident: notification.incident,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
