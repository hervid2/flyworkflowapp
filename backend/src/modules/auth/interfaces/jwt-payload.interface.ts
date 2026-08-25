import type { Role } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  orgId: string;
  role: Role;
  email: string;
}
