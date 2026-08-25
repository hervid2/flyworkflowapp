import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Guards a route whose `:id` param is an organization id. `superadmin` gets
 * cross-org visibility (`requirements.md §1.6`); everyone else must match
 * their own `orgId`. A mismatch is a 404, never a 403 — `api-contracts.md`
 * never reveals that a resource exists in another tenant.
 */
@Injectable()
export class OrgScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
    }>();
    const { user, params } = request;
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (params.id && params.id !== user.orgId) {
      throw new NotFoundException();
    }
    return true;
  }
}
