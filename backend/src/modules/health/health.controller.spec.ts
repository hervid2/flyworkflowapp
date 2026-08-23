import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports ok status with an ISO timestamp', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
