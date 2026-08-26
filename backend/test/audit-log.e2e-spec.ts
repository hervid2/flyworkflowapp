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

interface AuditLogEntry {
  id: string;
  incidentId: string;
  action: string;
  actor: { id: string };
}

interface PaginatedAuditLogBody {
  items: AuditLogEntry[];
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

describe('Audit log (e2e)', () => {
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

  it('rejects a plain member with 403', async () => {
    const token = await loginAs(app, orgAMember, 'password123');

    await request(app.getHttpServer())
      .get('/audit-log')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('records a "created" entry when an incident is created', async () => {
    const memberToken = await loginAs(app, orgAMember, 'password123');
    const adminToken = await loginAs(app, orgAAdmin, 'password123');

    const createRes = await request(app.getHttpServer())
      .post('/incidents')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId: projectA.id,
        typeId: plumbingType.id,
        title: 'Leaking pipe',
        description: 'Water leak',
        priority: 'high',
      })
      .expect(201);
    const incidentId = (createRes.body as { id: string }).id;

    const res = await request(app.getHttpServer())
      .get('/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = res.body as PaginatedAuditLogBody;
    expect(body.total).toBe(1);
    expect(body.items[0]).toMatchObject({
      incidentId,
      action: 'created',
      actor: { id: orgAMember.id },
    });
  });

  it('records "status_changed" and a dynamic "approved"/"rejected" action from the approval decision', async () => {
    const memberToken = await loginAs(app, orgAMember, 'password123');
    const adminToken = await loginAs(app, orgAAdmin, 'password123');
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: orgAMember.id,
      title: 'Incident',
      priority: 'low',
      status: 'open',
    });

    await request(app.getHttpServer())
      .patch(`/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'on_pause' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/incidents/${incident.id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'rejected', reason: 'Missing evidence' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const actions = (res.body as PaginatedAuditLogBody).items.map(
      (i) => i.action,
    );
    expect(actions.sort()).toEqual(['rejected', 'status_changed'].sort());
  });

  it('filters by userId', async () => {
    const adminToken = await loginAs(app, orgAAdmin, 'password123');
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: orgAMember.id,
      title: 'Incident',
      priority: 'low',
    });
    await prisma.seedAuditLog({
      orgId: 'org-a',
      incidentId: incident.id,
      actorId: orgAMember.id,
      action: 'updated',
    });
    await prisma.seedAuditLog({
      orgId: 'org-a',
      incidentId: incident.id,
      actorId: orgAAdmin.id,
      action: 'deleted',
    });

    const res = await request(app.getHttpServer())
      .get(`/audit-log?userId=${orgAAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = res.body as PaginatedAuditLogBody;
    expect(body.total).toBe(1);
    expect(body.items[0].action).toBe('deleted');
  });

  it('never returns audit entries from another organization', async () => {
    const adminToken = await loginAs(app, orgAAdmin, 'password123');
    const otherOwner = await prisma.seedUser({
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
    const otherIncident = await prisma.seedIncident({
      orgId: 'org-b',
      projectId: otherProject.id,
      typeId: plumbingType.id,
      ownerId: otherOwner.id,
      title: 'Other org incident',
      priority: 'low',
    });
    await prisma.seedAuditLog({
      orgId: 'org-b',
      incidentId: otherIncident.id,
      actorId: otherOwner.id,
      action: 'created',
    });

    const res = await request(app.getHttpServer())
      .get('/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((res.body as PaginatedAuditLogBody).total).toBe(0);
  });
});
