import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import type { HealthStatus } from './../src/modules/health/health-status.interface';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Uses the shared harness (fake Prisma/storage) like every other e2e
    // spec — building AppModule directly here previously meant this was the
    // only spec instantiating the real S3StorageProvider, which throws
    // without AWS_REGION/S3_BUCKET_NAME set (only present locally via the
    // gitignored .env, never in backend-ci.yml's job env).
    const testApp = await createTestApp();
    app = testApp.app;
  });

  it('/health (GET) reports ok status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as HealthStatus;
        expect(body.status).toBe('ok');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
