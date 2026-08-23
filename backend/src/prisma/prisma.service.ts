import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// No eager $connect() in onModuleInit on purpose: Prisma Client connects
// lazily on the first real query, so modules that don't touch the database
// (e.g. HealthModule) can boot without one — CI doesn't provision a Postgres
// service until F7.5 wires a real ephemeral database for e2e.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
