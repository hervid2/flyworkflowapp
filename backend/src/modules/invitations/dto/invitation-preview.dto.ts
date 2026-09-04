import type { Role } from '@prisma/client';

/** Public `GET /invitations/token/:token` response — enough for the accept page to render without exposing anything else. */
export class InvitationPreviewDto {
  email!: string;
  role!: Role;
  orgName!: string;
  expiresAt!: Date;
}
