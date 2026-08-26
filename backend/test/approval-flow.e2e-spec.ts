import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type {
  FakePrismaService,
  FakeUser,
  FakeProject,
  FakeIncidentType,
} from './utils/fake-prisma.service';

interface AccessTokenBody {
  accessToken: string;
}

interface IncidentBody {
  id: string;
  approval: string;
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

describe('Incident approval flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let orgAMember: FakeUser;
  let orgAAdmin: FakeUser;
  let projectA: FakeProject;
  let plumbingType: FakeIncidentType;

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
    projectA = await prisma.seedProject({
      orgId: 'org-a',
      name: 'Edificio Cedro Real',
    });
    plumbingType = await prisma.seedIncidentType({
      key: 'plumbing',
      name: 'Hidrosanitario',
      nameEn: 'Plumbing',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PATCH /incidents/:id/approval', () => {
    it('rejects a plain member (including the owner) with 403', async () => {
      const token = await loginAs(app, orgAMember, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Pending incident',
        priority: 'low',
      });

      await request(app.getHttpServer())
        .patch(`/incidents/${incident.id}/approval`)
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'approved' })
        .expect(403);
    });

    it('lets an admin approve a pending incident', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Pending incident',
        priority: 'low',
      });

      const res = await request(app.getHttpServer())
        .patch(`/incidents/${incident.id}/approval`)
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'approved' })
        .expect(200);

      expect((res.body as IncidentBody).approval).toBe('approved');
    });

    it('lets an admin reject a pending incident with a reason', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Pending incident',
        priority: 'low',
      });

      const res = await request(app.getHttpServer())
        .patch(`/incidents/${incident.id}/approval`)
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'rejected', reason: 'Missing evidence photos' })
        .expect(200);

      expect((res.body as IncidentBody).approval).toBe('rejected');
    });

    it('rejects re-deciding an already-approved incident with 409', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Already approved',
        priority: 'low',
        approval: 'approved',
      });

      await request(app.getHttpServer())
        .patch(`/incidents/${incident.id}/approval`)
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'rejected' })
        .expect(409);
    });

    it('rejects an invalid decision value with 400', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Pending incident',
        priority: 'low',
      });

      await request(app.getHttpServer())
        .patch(`/incidents/${incident.id}/approval`)
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'maybe' })
        .expect(400);
    });
  });
});
