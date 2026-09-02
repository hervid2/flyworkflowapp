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

interface NotificationEntry {
  id: string;
  type: string;
  incident: { id: string; sequenceId: string; title: string };
  readAt: string | null;
  createdAt: string;
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

async function getNotifications(
  app: INestApplication<App>,
  token: string,
  since?: string,
): Promise<NotificationEntry[]> {
  const res = await request(app.getHttpServer())
    .get(since ? `/notifications?since=${since}` : '/notifications')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as NotificationEntry[];
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let owner: FakeUser;
  let assignee: FakeUser;
  let admin: FakeUser;
  let projectA: FakeProject;
  let plumbingType: FakeIncidentType;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp());
    owner = await prisma.seedUser({
      email: 'owner@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'member',
      name: 'Owner',
    });
    assignee = await prisma.seedUser({
      email: 'assignee@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'member',
      name: 'Assignee',
    });
    admin = await prisma.seedUser({
      email: 'admin@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'admin',
      name: 'Admin',
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

  it('notifies newly assigned users on create, but not the creator/owner', async () => {
    const ownerToken = await loginAs(app, owner, 'password123');
    const assigneeToken = await loginAs(app, assignee, 'password123');

    const createRes = await request(app.getHttpServer())
      .post('/incidents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        projectId: projectA.id,
        typeId: plumbingType.id,
        title: 'Leaking pipe',
        description: 'Water leak',
        priority: 'high',
        assigneeIds: [assignee.id],
      })
      .expect(201);
    const incidentId = (createRes.body as { id: string }).id;

    const assigneeNotifications = await getNotifications(app, assigneeToken);
    expect(assigneeNotifications).toHaveLength(1);
    expect(assigneeNotifications[0]).toMatchObject({
      type: 'assignment',
      incident: { id: incidentId, title: 'Leaking pipe' },
      readAt: null,
    });

    const ownerNotifications = await getNotifications(app, ownerToken);
    expect(ownerNotifications).toHaveLength(0);
  });

  it('notifies only the newly added assignee on update, not one already assigned', async () => {
    const ownerToken = await loginAs(app, owner, 'password123');
    const assigneeToken = await loginAs(app, assignee, 'password123');
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: owner.id,
      title: 'Incident',
      priority: 'low',
      assigneeIds: [assignee.id],
    });

    await request(app.getHttpServer())
      .patch(`/incidents/${incident.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assigneeIds: [assignee.id, admin.id] })
      .expect(200);

    const adminToken = await loginAs(app, admin, 'password123');
    expect(await getNotifications(app, adminToken)).toHaveLength(1);
    // Already assigned before the update — no repeat notification.
    expect(await getNotifications(app, assigneeToken)).toHaveLength(0);
  });

  it('notifies the owner and assignees on status change, excluding the actor', async () => {
    const assigneeToken = await loginAs(app, assignee, 'password123');
    const ownerToken = await loginAs(app, owner, 'password123');
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: owner.id,
      title: 'Incident',
      priority: 'low',
      status: 'open',
      assigneeIds: [assignee.id],
    });

    // The assignee makes the change — should notify the owner, not themself.
    await request(app.getHttpServer())
      .patch(`/incidents/${incident.id}/status`)
      .set('Authorization', `Bearer ${assigneeToken}`)
      .send({ status: 'on_pause' })
      .expect(200);

    expect(await getNotifications(app, ownerToken)).toHaveLength(1);
    expect(await getNotifications(app, assigneeToken)).toHaveLength(0);
  });

  it('notifies the owner on an approval decision', async () => {
    const adminToken = await loginAs(app, admin, 'password123');
    const ownerToken = await loginAs(app, owner, 'password123');
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: owner.id,
      title: 'Incident',
      priority: 'low',
    });

    await request(app.getHttpServer())
      .patch(`/incidents/${incident.id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved' })
      .expect(200);

    const ownerNotifications = await getNotifications(app, ownerToken);
    expect(ownerNotifications).toHaveLength(1);
    expect(ownerNotifications[0].type).toBe('approval');
  });

  it("never returns another user's notifications", async () => {
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: owner.id,
      title: 'Incident',
      priority: 'low',
    });
    await prisma.seedNotification({
      orgId: 'org-a',
      recipientId: owner.id,
      incidentId: incident.id,
      type: 'assignment',
    });

    const assigneeToken = await loginAs(app, assignee, 'password123');
    expect(await getNotifications(app, assigneeToken)).toHaveLength(0);
  });

  it('filters by ?since= for incremental polling', async () => {
    const ownerToken = await loginAs(app, owner, 'password123');
    const incident = await prisma.seedIncident({
      orgId: 'org-a',
      projectId: projectA.id,
      typeId: plumbingType.id,
      ownerId: owner.id,
      title: 'Incident',
      priority: 'low',
    });
    await prisma.seedNotification({
      orgId: 'org-a',
      recipientId: owner.id,
      incidentId: incident.id,
      type: 'assignment',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await prisma.seedNotification({
      orgId: 'org-a',
      recipientId: owner.id,
      incidentId: incident.id,
      type: 'status_changed',
      createdAt: new Date('2026-01-03T00:00:00Z'),
    });

    const recent = await getNotifications(
      app,
      ownerToken,
      '2026-01-02T00:00:00Z',
    );
    expect(recent).toHaveLength(1);
    expect(recent[0].type).toBe('status_changed');
  });

  describe('PATCH /notifications/:id/read', () => {
    it("marks the caller's own notification as read", async () => {
      const ownerToken = await loginAs(app, owner, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: owner.id,
        title: 'Incident',
        priority: 'low',
      });
      const notification = await prisma.seedNotification({
        orgId: 'org-a',
        recipientId: owner.id,
        incidentId: incident.id,
        type: 'assignment',
      });

      await request(app.getHttpServer())
        .patch(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const [entry] = await getNotifications(app, ownerToken);
      expect(entry.readAt).not.toBeNull();
    });

    it("rejects marking a colleague's notification as read with 403", async () => {
      const assigneeToken = await loginAs(app, assignee, 'password123');
      const incident = await prisma.seedIncident({
        orgId: 'org-a',
        projectId: projectA.id,
        typeId: plumbingType.id,
        ownerId: owner.id,
        title: 'Incident',
        priority: 'low',
      });
      const notification = await prisma.seedNotification({
        orgId: 'org-a',
        recipientId: owner.id,
        incidentId: incident.id,
        type: 'assignment',
      });

      await request(app.getHttpServer())
        .patch(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${assigneeToken}`)
        .expect(403);
    });

    it('returns 404 for an unknown notification id', async () => {
      const ownerToken = await loginAs(app, owner, 'password123');

      await request(app.getHttpServer())
        .patch('/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
