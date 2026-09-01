import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncidentTypesService } from './incident-types.service';
import { IncidentTypeResponseDto } from './dto/incident-type-response.dto';

@ApiTags('incident-types')
@ApiBearerAuth()
@Controller('incident-types')
export class IncidentTypesController {
  constructor(private readonly incidentTypesService: IncidentTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List the shared incident type catalog' })
  findAll(): Promise<IncidentTypeResponseDto[]> {
    return this.incidentTypesService.findAll();
  }
}
