import * as bcrypt from 'bcrypt';
import type { Role } from '@prisma/client';

/**
 * Stands in for `PrismaService` in e2e tests. `F7.5` wires a real ephemeral
 * Postgres into CI; until then, this in-memory double implements just the
 * delegate methods the auth/RBAC modules actually call, matching Prisma's
 * shape closely enough for `overrideProvider(PrismaService)` to work as a
 * drop-in (`best-practices.md §Testing`: mocks are for real boundaries).
 */

export interface FakeUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  avatarUrl: string | null;
  createdAt: Date;
}

interface FakeRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export class FakePrismaService {
  readonly users: FakeUser[] = [];
  readonly refreshTokens: FakeRefreshToken[] = [];
  private idCounter = 0;

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  async seedUser(params: {
    email: string;
    password: string;
    orgId: string;
    role: Role;
    name?: string;
  }): Promise<FakeUser> {
    const user: FakeUser = {
      id: this.nextId('user'),
      orgId: params.orgId,
      name: params.name ?? 'Test User',
      email: params.email,
      // Low cost factor: this only needs to be correct, not production-strength.
      passwordHash: await bcrypt.hash(params.password, 4),
      role: params.role,
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  readonly user = {
    findUnique: ({
      where,
    }: {
      where: { email?: string; id?: string };
    }): Promise<FakeUser | null> => {
      const found = where.email
        ? this.users.find((u) => u.email === where.email)
        : this.users.find((u) => u.id === where.id);
      return Promise.resolve(found ?? null);
    },
    findMany: ({
      where,
    }: {
      where: { orgId: string };
    }): Promise<FakeUser[]> => {
      return Promise.resolve(this.users.filter((u) => u.orgId === where.orgId));
    },
  };

  readonly refreshToken = {
    create: ({
      data,
    }: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }): Promise<FakeRefreshToken> => {
      const row: FakeRefreshToken = {
        id: this.nextId('rt'),
        revokedAt: null,
        createdAt: new Date(),
        ...data,
      };
      this.refreshTokens.push(row);
      return Promise.resolve(row);
    },
    findFirst: ({
      where,
    }: {
      where: { tokenHash: string };
    }): Promise<(FakeRefreshToken & { user: FakeUser | null }) | null> => {
      const row = this.refreshTokens.find(
        (t) => t.tokenHash === where.tokenHash,
      );
      if (!row) return Promise.resolve(null);
      const user = this.users.find((u) => u.id === row.userId) ?? null;
      return Promise.resolve({ ...row, user });
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeRefreshToken>;
    }): Promise<FakeRefreshToken | null> => {
      const row = this.refreshTokens.find((t) => t.id === where.id);
      if (row) Object.assign(row, data);
      return Promise.resolve(row ?? null);
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { userId: string; tokenHash: string; revokedAt: null };
      data: Partial<FakeRefreshToken>;
    }): Promise<{ count: number }> => {
      const matches = this.refreshTokens.filter(
        (t) =>
          t.userId === where.userId &&
          t.tokenHash === where.tokenHash &&
          t.revokedAt === null,
      );
      matches.forEach((row) => Object.assign(row, data));
      return Promise.resolve({ count: matches.length });
    },
  };
}
