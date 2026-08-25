import type { Role } from '@prisma/client';

/** Shared response shape for `GET /users/me` and `GET /organizations/:id/members` — never the passwordHash. */
export class UserProfileDto {
  id!: string;
  orgId!: string;
  name!: string;
  email!: string;
  role!: Role;
  avatarUrl!: string | null;
  createdAt!: Date;
}

export function toUserProfileDto(user: {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  createdAt: Date;
}): UserProfileDto {
  return {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
