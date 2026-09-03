import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { FakePrismaService, FakeUser } from './utils/fake-prisma.service';

interface AccessTokenBody {
  accessToken: string;
}

interface UserProfileBody {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

async function loginAs(
  app: INestApplication<App>,
  user: FakeUser,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: user.email, password })
    .expect(200);
  return (res.body as AccessTokenBody).accessToken;
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let owner: FakeUser;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp());
    owner = await prisma.seedUser({
      email: 'owner@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'member',
      name: 'Owner',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PATCH /users/me', () => {
    it("updates the caller's own name and avatar", async () => {
      const token = await loginAs(app, owner, 'password123');

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', avatarUrl: 'https://example.com/a.png' })
        .expect(200);

      const body = res.body as UserProfileBody;
      expect(body.name).toBe('New Name');
      expect(body.avatarUrl).toBe('https://example.com/a.png');
    });

    it('leaves fields untouched when omitted from the body', async () => {
      const token = await loginAs(app, owner, 'password123');

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Only Name Changed' })
        .expect(200);

      expect((res.body as UserProfileBody).name).toBe('Only Name Changed');
      expect((res.body as UserProfileBody).email).toBe(owner.email);
    });

    it('clears the avatar when explicitly set to null', async () => {
      const token = await loginAs(app, owner, 'password123');
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatarUrl: 'https://example.com/a.png' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatarUrl: null })
        .expect(200);

      expect((res.body as UserProfileBody).avatarUrl).toBeNull();
    });

    it('rejects an invalid avatar URL with 400', async () => {
      const token = await loginAs(app, owner, 'password123');

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatarUrl: 'not-a-url' })
        .expect(400);
    });

    it('rejects the request without a valid token with 401', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .send({ name: 'No Auth' })
        .expect(401);
    });
  });

  describe('PATCH /users/me/password', () => {
    it('changes the password when the current one is correct', async () => {
      const token = await loginAs(app, owner, 'password123');

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: owner.email, password: 'newpassword456' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: owner.email, password: 'password123' })
        .expect(401);
    });

    it('rejects with 401 when the current password is wrong', async () => {
      const token = await loginAs(app, owner, 'password123');

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'newpassword456',
        })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: owner.email, password: 'password123' })
        .expect(200);
    });

    it('rejects a new password shorter than 8 characters with 400', async () => {
      const token = await loginAs(app, owner, 'password123');

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'short' })
        .expect(400);
    });
  });
});
