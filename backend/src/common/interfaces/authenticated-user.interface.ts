import type { Role } from '@prisma/client';

/** Shape attached to `request.user` once a request clears `JwtAuthGuard`. */
export interface AuthenticatedUser {
  id: string;
  orgId: string;
  role: Role;
  email: string;
}
