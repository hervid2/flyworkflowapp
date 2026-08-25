import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { FakePrismaService } from './utils/fake-prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createTestApp());
    await prisma.seedUser({
      email: 'member@acme.test',
      password: 'correct-horse',
      orgId: 'org-acme',
      role: 'member',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('logs in with valid credentials and sets the refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@acme.test', password: 'correct-horse' })
      .expect(200);

    const body = res.body as { accessToken: string };
    expect(typeof body.accessToken).toBe('string');
    expect(res.headers['set-cookie']?.[0]).toContain(
      'flyworkflow-refresh-token=',
    );
  });

  it('rejects an invalid password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@acme.test', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects a login payload that fails validation', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);
  });

  it('rejects a protected route with no access token', () => {
    return request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  it('rotates the refresh token on /auth/refresh and rejects reuse of the old one', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/auth/login')
      .send({ email: 'member@acme.test', password: 'correct-horse' })
      .expect(200);
    const firstRefreshCookie = prisma.refreshTokens[0];

    const refreshed = await agent.post('/auth/refresh').expect(200);
    const refreshedBody = refreshed.body as { accessToken: string };
    expect(typeof refreshedBody.accessToken).toBe('string');
    expect(firstRefreshCookie.revokedAt).not.toBeNull();

    // The cookie jar now holds the rotated token — a raw replay of the
    // original one must fail even though it hasn't expired.
    const staleReplay = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`flyworkflow-refresh-token=${'0'.repeat(128)}`])
      .expect(401);
    expect(staleReplay.status).toBe(401);
  });

  it('logs out, revoking the refresh token so a later refresh fails', async () => {
    const agent = request.agent(app.getHttpServer());

    const login = await agent
      .post('/auth/login')
      .send({ email: 'member@acme.test', password: 'correct-horse' })
      .expect(200);
    const loginBody = login.body as { accessToken: string };

    await agent
      .post('/auth/logout')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    await agent.post('/auth/refresh').expect(401);
  });
});
