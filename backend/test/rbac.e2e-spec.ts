import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { FakePrismaService, FakeUser } from './utils/fake-prisma.service';

interface AccessTokenBody {
  accessToken: string;
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

describe('Users / Organizations RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let orgAMember: FakeUser;
  let orgAAdmin: FakeUser;
  let orgBAdmin: FakeUser;
  let flySuperadmin: FakeUser;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp());
    orgAMember = await prisma.seedUser({
      email: 'member@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'member',
      name: 'Org A Member',
    });
    orgAAdmin = await prisma.seedUser({
      email: 'admin@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'admin',
      name: 'Org A Admin',
    });
    orgBAdmin = await prisma.seedUser({
      email: 'admin@org-b.test',
      password: 'password123',
      orgId: 'org-b',
      role: 'admin',
      name: 'Org B Admin',
    });
    flySuperadmin = await prisma.seedUser({
      email: 'super@fly.test',
      password: 'password123',
      orgId: 'org-fly',
      role: 'superadmin',
      name: 'Fly Superadmin',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it("returns the authenticated user's own profile without the password hash", async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: orgAMember.id,
        orgId: 'org-a',
        email: 'member@org-a.test',
        role: 'member',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /organizations/:id/members', () => {
    it('lets an org admin list their own organization members', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      const res = await request(app.getHttpServer())
        .get('/organizations/org-a/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const emails = (res.body as { email: string }[]).map((m) => m.email);
      expect(emails.sort()).toEqual(
        ['admin@org-a.test', 'member@org-a.test'].sort(),
      );
    });

    it('rejects a plain member with 403 (insufficient role)', async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      await request(app.getHttpServer())
        .get('/organizations/org-a/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects an admin reaching into another organization with 404 (never 403)', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      await request(app.getHttpServer())
        .get('/organizations/org-b/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('lets a superadmin cross into another organization', async () => {
      const token = await loginAs(app, flySuperadmin, 'password123');

      const res = await request(app.getHttpServer())
        .get('/organizations/org-b/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect((res.body as { email: string }[]).map((m) => m.email)).toEqual([
        orgBAdmin.email,
      ]);
    });
  });
});
