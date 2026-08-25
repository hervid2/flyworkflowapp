import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Minimum role required, checked by `RolesGuard` against the role hierarchy (member < admin < superadmin). */
export const Roles = (minimumRole: Role) => SetMetadata(ROLES_KEY, minimumRole);
