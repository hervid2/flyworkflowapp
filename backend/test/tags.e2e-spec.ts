import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { FakePrismaService, FakeUser } from './utils/fake-prisma.service';

interface AccessTokenBody {
  accessToken: string;
}

interface TagBody {
  id: string;
  orgId: string;
  name: string;
  color: string;
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

describe('Tags (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let orgAMember: FakeUser;
  let orgAAdmin: FakeUser;

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
    await prisma.seedTag({ orgId: 'org-a', name: 'Urgente', color: '#F59E0B' });
    await prisma.seedTag({
      orgId: 'org-b',
      name: 'Other org tag',
      color: '#000000',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /tags', () => {
    it("lists only the caller's organization tags", async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      const res = await request(app.getHttpServer())
        .get('/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body as TagBody[]).map((t) => t.name);
      expect(names).toEqual(['Urgente']);
    });
  });

  describe('POST /tags', () => {
    it('rejects a plain member with 403', async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nueva', color: '#123456' })
        .expect(403);
    });

    it('lets an admin create a tag scoped to their own organization', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      const res = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nueva', color: '#123456' })
        .expect(201);

      expect(res.body).toMatchObject({ orgId: 'org-a', name: 'Nueva' });
    });

    it('rejects an invalid hex color with 400', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');

      await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nueva', color: 'not-a-color' })
        .expect(400);
    });
  });

  describe('PATCH /tags/:id', () => {
    it('rejects an admin editing a tag from another organization with 404', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const otherTag = prisma.tags.find((t) => t.orgId === 'org-b')!;

      await request(app.getHttpServer())
        .patch(`/tags/${otherTag.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed' })
        .expect(404);
    });
  });

  describe('DELETE /tags/:id', () => {
    it('lets an admin delete their own organization tag', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const ownTag = prisma.tags.find((t) => t.orgId === 'org-a')!;

      await request(app.getHttpServer())
        .delete(`/tags/${ownTag.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(prisma.tags.find((t) => t.id === ownTag.id)).toBeUndefined();
    });
  });
});
