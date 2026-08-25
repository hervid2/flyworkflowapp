import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface UserRow {
  id: string;
  orgId: string;
  role: Role;
  email: string;
  passwordHash: string;
}

interface RefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn((): Promise<UserRow | null> => Promise.resolve(null)),
    },
    refreshToken: {
      create: jest.fn(
        (args: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }): Promise<RefreshTokenRow> =>
          Promise.resolve({ id: 'rt-new', revokedAt: null, ...args.data }),
      ),
      findFirst: jest.fn(
        (): Promise<(RefreshTokenRow & { user: UserRow }) | null> =>
          Promise.resolve(null),
      ),
      update: jest.fn(
        (args: {
          where: { id: string };
          data: Partial<RefreshTokenRow>;
        }): Promise<RefreshTokenRow> =>
          Promise.resolve({
            id: args.where.id,
            userId: 'u1',
            tokenHash: 'old-hash',
            expiresAt: new Date(),
            revokedAt: null,
            ...args.data,
          }),
      ),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [
          {
            where: { userId: string; tokenHash: string; revokedAt: null };
            data: Partial<RefreshTokenRow>;
          },
        ]
      >(),
    },
  };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  const sign = jest.fn((): string => 'signed.jwt.token');
  const jwtService = { sign } as unknown as JwtService;
  const configService = {
    getOrThrow: jest.fn((): string => 'test-secret'),
    get: jest.fn(<T>(_key: string, fallback?: T): T | undefined => fallback),
  } as unknown as ConfigService;

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService,
    configService,
  );
  return { service, sign };
}

describe('AuthService', () => {
  describe('validateCredentials', () => {
    it('returns the authenticated user shape when the password matches', async () => {
      const prisma = createPrismaMock();
      const passwordHash = await bcrypt.hash('secret', 4);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        orgId: 'org1',
        role: 'member',
        email: 'a@b.com',
        passwordHash,
      });
      const { service } = createService(prisma);

      const result = await service.validateCredentials('a@b.com', 'secret');

      expect(result).toEqual({
        id: 'u1',
        orgId: 'org1',
        role: 'member',
        email: 'a@b.com',
      });
    });

    it('returns null for an unknown email', async () => {
      const prisma = createPrismaMock();
      const { service } = createService(prisma);

      expect(
        await service.validateCredentials('nope@b.com', 'secret'),
      ).toBeNull();
    });

    it('returns null for a wrong password', async () => {
      const prisma = createPrismaMock();
      const passwordHash = await bcrypt.hash('secret', 4);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        orgId: 'org1',
        role: 'member',
        email: 'a@b.com',
        passwordHash,
      });
      const { service } = createService(prisma);

      expect(await service.validateCredentials('a@b.com', 'wrong')).toBeNull();
    });
  });

  describe('login', () => {
    it('signs an access token and persists a hashed (not raw) refresh token', async () => {
      const prisma = createPrismaMock();
      const { service, sign } = createService(prisma);
      let persistedTokenHash: string | undefined;
      prisma.refreshToken.create.mockImplementationOnce(
        (args: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          persistedTokenHash = args.data.tokenHash;
          return Promise.resolve({
            id: 'rt-new',
            revokedAt: null,
            ...args.data,
          });
        },
      );

      const tokens = await service.login({
        id: 'u1',
        orgId: 'org1',
        role: 'member',
        email: 'a@b.com',
      });

      expect(sign).toHaveBeenCalled();
      expect(tokens.accessToken).toBe('signed.jwt.token');
      expect(tokens.refreshToken).toHaveLength(128);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(persistedTokenHash).toEqual(expect.any(String));
      expect(persistedTokenHash).not.toBe(tokens.refreshToken);
    });
  });

  describe('refresh', () => {
    it('rejects a token with no matching record', async () => {
      const prisma = createPrismaMock();
      const { service } = createService(prisma);

      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an already-revoked token', async () => {
      const prisma = createPrismaMock();
      prisma.refreshToken.findFirst.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10_000),
        user: {
          id: 'u1',
          orgId: 'org1',
          role: 'member',
          email: 'a@b.com',
          passwordHash: 'x',
        },
      });
      const { service } = createService(prisma);

      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      const prisma = createPrismaMock();
      prisma.refreshToken.findFirst.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 10_000),
        user: {
          id: 'u1',
          orgId: 'org1',
          role: 'member',
          email: 'a@b.com',
          passwordHash: 'x',
        },
      });
      const { service } = createService(prisma);

      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates a valid token: revokes the old one and issues a new one', async () => {
      const prisma = createPrismaMock();
      prisma.refreshToken.findFirst.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user: {
          id: 'u1',
          orgId: 'org1',
          role: 'member',
          email: 'a@b.com',
          passwordHash: 'x',
        },
      });
      let updateArgs:
        { where: { id: string }; data: Partial<RefreshTokenRow> } | undefined;
      prisma.refreshToken.update.mockImplementationOnce((args) => {
        updateArgs = args;
        return Promise.resolve({
          id: args.where.id,
          userId: 'u1',
          tokenHash: 'old-hash',
          expiresAt: new Date(),
          revokedAt: null,
          ...args.data,
        });
      });
      const { service } = createService(prisma);

      const tokens = await service.refresh('token');

      expect(updateArgs?.where).toEqual({ id: 'rt1' });
      expect(updateArgs?.data.revokedAt).toBeInstanceOf(Date);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(tokens.accessToken).toBe('signed.jwt.token');
    });
  });

  describe('logout', () => {
    it('revokes only the matching, still-active refresh token for that user', async () => {
      const prisma = createPrismaMock();
      let updateManyArgs:
        | {
            where: { userId: string; tokenHash: string; revokedAt: null };
            data: Partial<RefreshTokenRow>;
          }
        | undefined;
      prisma.refreshToken.updateMany.mockImplementationOnce((args) => {
        updateManyArgs = args;
        return Promise.resolve({ count: 1 });
      });
      const { service } = createService(prisma);

      await service.logout('u1', 'raw-token');

      expect(updateManyArgs?.where.userId).toBe('u1');
      expect(updateManyArgs?.where.revokedAt).toBeNull();
      expect(updateManyArgs?.data.revokedAt).toBeInstanceOf(Date);
    });
  });
});
