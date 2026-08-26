import type { AuditAction } from '@prisma/client';
import { toUserRefDto, UserRefDto } from '../../../common/dto/user-ref.dto';

export class AuditLogResponseDto {
  id!: string;
  incidentId!: string;
  actor!: UserRefDto;
  action!: AuditAction;
  metadata!: unknown;
  createdAt!: Date;
}

export function toAuditLogResponseDto(log: {
  id: string;
  incidentId: string;
  actor: { id: string; name: string; email: string; avatarUrl: string | null };
  action: AuditAction;
  metadata: unknown;
  createdAt: Date;
}): AuditLogResponseDto {
  return {
    id: log.id,
    incidentId: log.incidentId,
    actor: toUserRefDto(log.actor),
    action: log.action,
    metadata: log.metadata,
    createdAt: log.createdAt,
  };
}
