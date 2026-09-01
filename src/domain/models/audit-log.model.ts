/**
 * Audit-trail domain model backing the `/historial` page — one entry per
 * mutation the backend's `AuditLogInterceptor` recorded (create, edit,
 * status change, approval decision, soft-delete, restore).
 */
import type { UserRef } from './incident.model';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'approved'
  | 'rejected'
  | 'deleted'
  | 'restored';

/** Lightweight incident reference embedded in an audit entry — enough to display without a per-row lookup. */
export interface AuditIncidentRef {
  id: string;
  sequenceId: string;
  title: string;
  project: { id: string; name: string };
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actor: UserRef;
  incident: AuditIncidentRef;
  createdAt: string;
}
