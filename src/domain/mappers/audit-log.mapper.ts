/**
 * Maps the backend's `/audit-log` response shape onto the frontend's
 * {@link AuditLogEntry} domain model. Mirrors incident.mapper.ts's role for
 * incidents — pure and framework-agnostic.
 */
import type { AuditLogEntry, AuditAction, UserRef } from '@/domain/models';

interface RawUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface RawAuditLogEntry {
  id: string;
  action: AuditAction;
  actor: RawUser;
  incident: {
    id: string;
    sequenceId: string;
    title: string;
    project: { id: string; name: string };
  };
  createdAt: string;
}

function toUserRef(user: RawUser): UserRef {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

export function toAuditLogEntry(raw: RawAuditLogEntry): AuditLogEntry {
  return {
    id: raw.id,
    action: raw.action,
    actor: toUserRef(raw.actor),
    incident: raw.incident,
    createdAt: raw.createdAt,
  };
}
