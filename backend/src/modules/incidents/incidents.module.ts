import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, AuditLogInterceptor],
  exports: [IncidentsService],
})
export class IncidentsModule {}
