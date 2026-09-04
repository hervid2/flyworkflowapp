import type { InvitationStatus, Role } from '@prisma/client';

export interface InvitationInviterRefDto {
  id: string;
  name: string;
}

/**
 * Admin-facing shape for `POST /invitations` and `GET /invitations`. `expired`
 * is computed at read time (not a stored status) — a `pending` row simply
 * ages out once `expiresAt` passes, no background job needed. `inviteUrl` is
 * only ever populated on the create response: the raw token lives nowhere
 * else after that (only its hash is persisted), so it can't be reconstructed later.
 */
export class InvitationResponseDto {
  id!: string;
  email!: string;
  role!: Role;
  status!: InvitationStatus;
  expired!: boolean;
  invitedBy!: InvitationInviterRefDto;
  createdAt!: Date;
  expiresAt!: Date;
  inviteUrl?: string;
}

export function toInvitationResponseDto(
  invitation: {
    id: string;
    email: string;
    role: Role;
    status: InvitationStatus;
    createdAt: Date;
    expiresAt: Date;
    invitedBy: InvitationInviterRefDto;
  },
  inviteUrl?: string,
): InvitationResponseDto {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expired:
      invitation.status === 'pending' && invitation.expiresAt < new Date(),
    invitedBy: invitation.invitedBy,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    ...(inviteUrl ? { inviteUrl } : {}),
  };
}
