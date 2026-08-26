import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { STORAGE_PROVIDER } from '../../src/lib/s3/storage-provider.interface';
import { configureApp } from '../../src/bootstrap';
import { FakePrismaService } from './fake-prisma.service';
import { FakeStorageProvider } from './fake-storage-provider';

export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: FakePrismaService;
  storage: FakeStorageProvider;
  moduleRef: TestingModule;
}> {
  const prisma = new FakePrismaService();
  const storage = new FakeStorageProvider();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(STORAGE_PROVIDER)
    .useValue(storage)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, prisma, storage, moduleRef };
}
