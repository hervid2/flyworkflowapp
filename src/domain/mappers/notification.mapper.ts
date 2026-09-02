/**
 * Maps the backend's `/notifications` response shape onto the frontend's
 * {@link AppNotification} domain model. Mirrors audit-log.mapper.ts's role.
 */
import type { AppNotification, AppNotificationType } from '@/domain/models';

export interface RawNotification {
  id: string;
  type: AppNotificationType;
  incident: {
    id: string;
    sequenceId: string;
    title: string;
    project: { id: string; name: string };
  };
  readAt: string | null;
  createdAt: string;
}

export function toAppNotification(raw: RawNotification): AppNotification {
  return {
    id: raw.id,
    type: raw.type,
    incident: raw.incident,
    readAt: raw.readAt,
    createdAt: raw.createdAt,
  };
}
