import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

function createContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}) as () => void,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function createReflector(minimumRole: Role | undefined): Reflector {
  return {
    getAllAndOverride: () => minimumRole,
  } as unknown as Reflector;
}

const baseUser: AuthenticatedUser = {
  id: 'u1',
  orgId: 'org1',
  role: 'member',
  email: 'a@b.com',
};

describe('RolesGuard', () => {
  it('allows the request through when no minimum role is required', () => {
    const guard = new RolesGuard(createReflector(undefined));
    expect(guard.canActivate(createContext(baseUser))).toBe(true);
  });

  it('allows a user whose role meets the minimum', () => {
    const guard = new RolesGuard(createReflector('admin'));
    expect(
      guard.canActivate(createContext({ ...baseUser, role: 'admin' })),
    ).toBe(true);
  });

  it('allows a superadmin on an admin-gated route', () => {
    const guard = new RolesGuard(createReflector('admin'));
    expect(
      guard.canActivate(createContext({ ...baseUser, role: 'superadmin' })),
    ).toBe(true);
  });

  it('rejects a member on an admin-gated route', () => {
    const guard = new RolesGuard(createReflector('admin'));
    expect(() => guard.canActivate(createContext(baseUser))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when there is no authenticated user', () => {
    const guard = new RolesGuard(createReflector('admin'));
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
