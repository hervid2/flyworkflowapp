import { Injectable } from '@nestjs/common';
import { HealthStatus } from './health-status.interface';

@Injectable()
export class HealthService {
  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
