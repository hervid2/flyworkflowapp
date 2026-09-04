import { IsEmail, IsIn, IsOptional } from 'class-validator';
import type { Role } from '@prisma/client';

/**
 * `POST /invitations` body. `role` is deliberately limited to `member`/`admin`
 * — inviting a `superadmin` (platform-level, cross-org) isn't exposed through
 * this org-scoped flow.
 */
export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(['member', 'admin'])
  role?: Extract<Role, 'member' | 'admin'>;
}
