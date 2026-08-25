import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { configureApp } from '../../src/bootstrap';
import { FakePrismaService } from './fake-prisma.service';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: FakePrismaService;
}> {
  const prisma = new FakePrismaService();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return { app, prisma };
}
