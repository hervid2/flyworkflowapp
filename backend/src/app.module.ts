import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { IncidentTypesModule } from './modules/incident-types/incident-types.module';
import { MediaModule } from './modules/media/media.module';
import { TagsModule } from './modules/tags/tags.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    IncidentsModule,
    IncidentTypesModule,
    MediaModule,
    TagsModule,
    AuditModule,
    NotificationsModule,
  ],
})
export class AppModule {}
