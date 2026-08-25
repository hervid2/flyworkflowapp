import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { configureApp } from '../../src/bootstrap';
import { FakePrismaService } from './fake-prisma.service';

export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: FakePrismaService;
  moduleRef: TestingModule;
}> {
  const prisma = new FakePrismaService();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, prisma, moduleRef };
}
