import { Module } from '@nestjs/common';
import { IncidentTypesController } from './incident-types.controller';
import { IncidentTypesService } from './incident-types.service';

@Module({
  controllers: [IncidentTypesController],
  providers: [IncidentTypesService],
})
export class IncidentTypesModule {}
