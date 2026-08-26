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

interface PaginatedIncidentsBody {
  items: { id: string; title: string; deleted: boolean }[];
  total: number;
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

describe('Incidents trash/restore (e2e)', () => {
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

  describe('GET /incidents/trash', () => {
    it('rejects a plain member with 403', async () => {
      const token = await loginAs(app, orgAMember, 'password123');

      await request(app.getHttpServer())
        .get('/incidents/trash')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('lists only soft-deleted incidents in the caller organization', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Active incident',
        priority: 'low',
        deleted: false,
      });
      await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Deleted incident',
        priority: 'low',
        deleted: true,
      });

      const res = await request(app.getHttpServer())
        .get('/incidents/trash')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as PaginatedIncidentsBody;
      expect(body.total).toBe(1);
      expect(body.items[0].title).toBe('Deleted incident');
      expect(body.items[0].deleted).toBe(true);
    });
  });

  describe('POST /incidents/:id/restore', () => {
    it('rejects a plain member with 403', async () => {
      const token = await loginAs(app, orgAMember, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Deleted incident',
        priority: 'low',
        deleted: true,
      });

      await request(app.getHttpServer())
        .post(`/incidents/${incident.id}/restore`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('restores a deleted incident, making it visible again in the default list', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Deleted incident',
        priority: 'low',
        deleted: true,
      });

      await request(app.getHttpServer())
        .post(`/incidents/${incident.id}/restore`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/incidents/${incident.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('returns 404 restoring an incident that is not in the trash', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: orgAMember.id,
        title: 'Not deleted',
        priority: 'low',
        deleted: false,
      });

      await request(app.getHttpServer())
        .post(`/incidents/${incident.id}/restore`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 404 restoring an incident from another organization', async () => {
      const token = await loginAs(app, orgAAdmin, 'password123');
      const otherOrgOwner = await prisma.seedUser({
        email: 'owner@org-b.test',
        password: 'password123',
        orgId: 'org-b',
        role: 'member',
        name: 'Org B Owner',
      });
      const otherProject = await prisma.seedProject({
        orgId: 'org-b',
        name: 'Los Almendros',
      });
      const incident = await prisma.seedIncident({
        orgId: 'org-b',
        projectId: otherProject.id,
        typeId: plumbingType.id,
        ownerId: otherOrgOwner.id,
        title: 'Other org deleted incident',
        priority: 'low',
        deleted: true,
      });

      await request(app.getHttpServer())
        .post(`/incidents/${incident.id}/restore`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
