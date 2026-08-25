import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

const ROLE_RANK: Record<Role, number> = {
  member: 0,
  admin: 1,
  superadmin: 2,
};

/** Requires `@Roles(minimumRole)` on the handler/class; routes without it are left open. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minimumRole = this.reflector.getAllAndOverride<Role | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!minimumRole) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (!user || ROLE_RANK[user.role] < ROLE_RANK[minimumRole]) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
