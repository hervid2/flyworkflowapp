import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { FakePrismaService, FakeUser } from './utils/fake-prisma.service';

interface AccessTokenBody {
  accessToken: string;
}

interface IncidentTypeBody {
  id: string;
  key: string;
  name: string;
  nameEn: string;
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

describe('Incident types (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let orgAMember: FakeUser;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp());
    orgAMember = await prisma.seedUser({
      email: 'member@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'member',
      name: 'Org A Member',
    });
    await prisma.seedIncidentType({
      key: 'plumbing',
      name: 'Hidrosanitario',
      nameEn: 'Plumbing',
    });
    await prisma.seedIncidentType({
      key: 'electrical',
      name: 'Electrico',
      nameEn: 'Electrical',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /incident-types', () => {
    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/incident-types').expect(401);
    });

    it('lists the shared catalog for any authenticated user, not org-scoped', async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      const res = await request(app.getHttpServer())
        .get('/incident-types')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const keys = (res.body as IncidentTypeBody[]).map((t) => t.key).sort();
      expect(keys).toEqual(['electrical', 'plumbing']);
    });
  });
});
