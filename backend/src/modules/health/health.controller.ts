import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import type { HealthStatus } from './health-status.interface';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Report whether the API is up and reachable' })
  @ApiResponse({ status: 200, description: 'The API is healthy.' })
  check(): HealthStatus {
    return this.healthService.check();
  }
}
