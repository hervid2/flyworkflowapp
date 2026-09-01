import type { AuditAction } from '@prisma/client';
import { toUserRefDto, UserRefDto } from '../../../common/dto/user-ref.dto';

/** Lightweight incident projection so the history view can show what changed without a second round-trip. */
export class AuditIncidentRefDto {
  id!: string;
  sequenceId!: string;
  title!: string;
  project!: { id: string; name: string };
}

export class AuditLogResponseDto {
  id!: string;
  incidentId!: string;
  incident!: AuditIncidentRefDto;
  actor!: UserRefDto;
  action!: AuditAction;
  metadata!: unknown;
  createdAt!: Date;
}

export function toAuditLogResponseDto(log: {
  id: string;
  incidentId: string;
  actor: { id: string; name: string; email: string; avatarUrl: string | null };
  incident: {
    id: string;
    sequenceId: string;
    title: string;
    project: { id: string; name: string };
  };
  action: AuditAction;
  metadata: unknown;
  createdAt: Date;
}): AuditLogResponseDto {
  return {
    id: log.id,
    incidentId: log.incidentId,
    incident: {
      id: log.incident.id,
      sequenceId: log.incident.sequenceId,
      title: log.incident.title,
      project: { id: log.incident.project.id, name: log.incident.project.name },
    },
    actor: toUserRefDto(log.actor),
    action: log.action,
    metadata: log.metadata,
    createdAt: log.createdAt,
  };
}
