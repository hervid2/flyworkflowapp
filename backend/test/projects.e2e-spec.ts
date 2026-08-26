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

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let orgAMember: FakeUser;
  let orgAAdmin: FakeUser;
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
    await prisma.seedUser({
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
    await prisma.seedProject({ orgId: 'org-a', name: 'Edificio Cedro Real' });
    await prisma.seedProject({ orgId: 'org-b', name: 'Los Almendros' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /projects', () => {
    it("lists only the caller's organization projects", async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      const res = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body as { name: string }[]).map((p) => p.name);
      expect(names).toEqual(['Edificio Cedro Real']);
    });

    it('returns an empty list for a superadmin with no projects of its own', async () => {
      const token = await loginAs(app, flySuperadmin, 'password123');

      const res = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /projects/:id', () => {
    it('rejects fetching a project from another organization with 404', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const otherProject = prisma.projects.find((p) => p.orgId === 'org-b')!;

      await request(app.getHttpServer())
        .get(`/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('lets a superadmin fetch a project from any organization', async () => {
      const token = await loginAs(app, flySuperadmin, 'password123');
      const otherProject = prisma.projects.find((p) => p.orgId === 'org-b')!;

      await request(app.getHttpServer())
        .get(`/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('POST /projects', () => {
    it('rejects a plain member with 403', async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Project' })
        .expect(403);
    });

    it('lets an admin create a project scoped to their own organization', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      const res = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Project' })
        .expect(201);

      expect(res.body).toMatchObject({ orgId: 'org-a', name: 'New Project' });
    });

    it('rejects an empty name with 400', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('rejects an admin editing a project from another organization with 404', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const otherProject = prisma.projects.find((p) => p.orgId === 'org-b')!;

      await request(app.getHttpServer())
        .patch(`/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed' })
        .expect(404);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('lets an admin delete their own organization project', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const ownProject = prisma.projects.find((p) => p.orgId === 'org-a')!;

      await request(app.getHttpServer())
        .delete(`/projects/${ownProject.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(
        prisma.projects.find((p) => p.id === ownProject.id),
      ).toBeUndefined();
    });

    it('returns 404 deleting a project that does not exist', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      await request(app.getHttpServer())
        .delete('/projects/does-not-exist')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
