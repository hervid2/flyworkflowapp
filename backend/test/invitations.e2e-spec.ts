import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { FakePrismaService, FakeUser } from './utils/fake-prisma.service';
import { hashToken } from '../src/common/utils/hash-token.util';

interface AccessTokenBody {
  accessToken: string;
}

interface InvitationBody {
  id: string;
  email: string;
  role: string;
  status: string;
  expired: boolean;
  inviteUrl?: string;
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

function extractToken(inviteUrl: string): string {
  return inviteUrl.split('/invitar/')[1];
}

describe('Invitations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let admin: FakeUser;
  let member: FakeUser;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp());
    await prisma.seedOrganization({ id: 'org-a', name: 'Org A' });
    admin = await prisma.seedUser({
      email: 'admin@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'admin',
      name: 'Admin',
    });
    member = await prisma.seedUser({
      email: 'member@org-a.test',
      password: 'password123',
      orgId: 'org-a',
      role: 'member',
      name: 'Member',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /invitations', () => {
    it('creates an invitation with a shareable link (admin+)', async () => {
      const token = await loginAs(app, admin, 'password123');

      const res = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new.collaborator@org-a.test', role: 'member' })
        .expect(201);

      const body = res.body as InvitationBody;
      expect(body.email).toBe('new.collaborator@org-a.test');
      expect(body.role).toBe('member');
      expect(body.status).toBe('pending');
      expect(body.expired).toBe(false);
      expect(body.inviteUrl).toContain('/invitar/');
    });

    it('rejects a member (non-admin) with 403', async () => {
      const token = await loginAs(app, member, 'password123');

      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new.collaborator@org-a.test' })
        .expect(403);
    });

    it('rejects an email that already belongs to a user with 409', async () => {
      const token = await loginAs(app, admin, 'password123');

      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: member.email })
        .expect(409);
    });

    it('rejects an invalid email with 400', async () => {
      const token = await loginAs(app, admin, 'password123');

      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('GET /invitations', () => {
    it("lists the organization's invitations, most recent first (admin+)", async () => {
      const token = await loginAs(app, admin, 'password123');
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'first@org-a.test' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'second@org-a.test' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as InvitationBody[];
      expect(body).toHaveLength(2);
      expect(body[0].email).toBe('second@org-a.test');
    });

    it('rejects a member (non-admin) with 403', async () => {
      const token = await loginAs(app, member, 'password123');
      await request(app.getHttpServer())
        .get('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('DELETE /invitations/:id', () => {
    it('revokes a pending invitation (admin+)', async () => {
      const token = await loginAs(app, admin, 'password123');
      const created = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'revoke.me@org-a.test' })
        .expect(201);
      const { id } = created.body as InvitationBody;

      await request(app.getHttpServer())
        .delete(`/invitations/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((list.body as InvitationBody[])[0].status).toBe('revoked');
    });

    it("returns 404 for another organization's invitation", async () => {
      const token = await loginAs(app, admin, 'password123');
      const otherOrgInvitation = await prisma.seedInvitation({
        orgId: 'org-b',
        email: 'outsider@org-b.test',
        tokenHash: 'unrelated-hash',
        invitedById: admin.id,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await request(app.getHttpServer())
        .delete(`/invitations/${otherOrgInvitation.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('rejects a member (non-admin) with 403', async () => {
      const token = await loginAs(app, member, 'password123');
      await request(app.getHttpServer())
        .delete('/invitations/some-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /invitations/token/:token (public)', () => {
    it('previews a valid invitation without auth', async () => {
      const token = await loginAs(app, admin, 'password123');
      const created = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'preview.me@org-a.test', role: 'admin' })
        .expect(201);
      const rawToken = extractToken(
        (created.body as InvitationBody).inviteUrl!,
      );

      const res = await request(app.getHttpServer())
        .get(`/invitations/token/${rawToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'preview.me@org-a.test',
        role: 'admin',
        orgName: 'Org A',
      });
    });

    it('returns 404 for an unknown token', async () => {
      await request(app.getHttpServer())
        .get('/invitations/token/does-not-exist')
        .expect(404);
    });

    it('returns 410 for an expired invitation', async () => {
      const rawToken = 'expired-raw-token';
      await prisma.seedInvitation({
        orgId: 'org-a',
        email: 'expired@org-a.test',
        tokenHash: hashToken(rawToken),
        invitedById: admin.id,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await request(app.getHttpServer())
        .get(`/invitations/token/${rawToken}`)
        .expect(410);
    });

    it('returns 410 for a revoked invitation', async () => {
      const token = await loginAs(app, admin, 'password123');
      const created = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'revoked.preview@org-a.test' })
        .expect(201);
      const body = created.body as InvitationBody;
      const rawToken = extractToken(body.inviteUrl!);

      await request(app.getHttpServer())
        .delete(`/invitations/${body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/invitations/token/${rawToken}`)
        .expect(410);
    });
  });

  describe('POST /invitations/token/:token/accept (public)', () => {
    it('creates the account and starts a session', async () => {
      const token = await loginAs(app, admin, 'password123');
      const created = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'accept.me@org-a.test', role: 'member' })
        .expect(201);
      const rawToken = extractToken(
        (created.body as InvitationBody).inviteUrl!,
      );

      const res = await request(app.getHttpServer())
        .post(`/invitations/token/${rawToken}/accept`)
        .send({ name: 'Accepted User', password: 'brandnewpassword' })
        .expect(200);

      const body = res.body as AccessTokenBody;
      expect(typeof body.accessToken).toBe('string');
      expect(res.headers['set-cookie']?.[0]).toContain(
        'flyworkflow-refresh-token=',
      );

      // The invitee can now log in with their own chosen password.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'accept.me@org-a.test', password: 'brandnewpassword' })
        .expect(200);
    });

    it('rejects reusing an already-accepted token with 410', async () => {
      const token = await loginAs(app, admin, 'password123');
      const created = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'once.only@org-a.test' })
        .expect(201);
      const rawToken = extractToken(
        (created.body as InvitationBody).inviteUrl!,
      );

      await request(app.getHttpServer())
        .post(`/invitations/token/${rawToken}/accept`)
        .send({ name: 'First Accept', password: 'brandnewpassword' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/invitations/token/${rawToken}/accept`)
        .send({ name: 'Second Accept', password: 'anotherpassword' })
        .expect(410);
    });

    it('rejects a password shorter than 8 characters with 400', async () => {
      const token = await loginAs(app, admin, 'password123');
      const created = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'short.password@org-a.test' })
        .expect(201);
      const rawToken = extractToken(
        (created.body as InvitationBody).inviteUrl!,
      );

      await request(app.getHttpServer())
        .post(`/invitations/token/${rawToken}/accept`)
        .send({ name: 'Short Password', password: 'short' })
        .expect(400);
    });
  });
});
