import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { OrgScopeGuard } from './org-scope.guard';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

function createContext(
  user: AuthenticatedUser | undefined,
  params: Record<string, string>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('OrgScopeGuard', () => {
  const guard = new OrgScopeGuard();

  it('allows a user requesting their own organization', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      orgId: 'org-a',
      role: 'admin',
      email: 'a@b.com',
    };
    expect(guard.canActivate(createContext(user, { id: 'org-a' }))).toBe(true);
  });

  it('denies a user requesting a different organization with a 404, not a 403', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      orgId: 'org-a',
      role: 'admin',
      email: 'a@b.com',
    };
    expect(() =>
      guard.canActivate(createContext(user, { id: 'org-b' })),
    ).toThrow(NotFoundException);
  });

  it('lets a superadmin cross into another organization', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      orgId: 'org-a',
      role: 'superadmin',
      email: 'a@b.com',
    };
    expect(guard.canActivate(createContext(user, { id: 'org-b' }))).toBe(true);
  });

  it('denies when there is no authenticated user', () => {
    expect(guard.canActivate(createContext(undefined, { id: 'org-a' }))).toBe(
      false,
    );
  });
});
