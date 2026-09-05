import { Module } from '@nestjs/common';
import { ProjectPlansController } from './project-plans.controller';
import { ProjectPlansService } from './project-plans.service';
import { S3Module } from '../../lib/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [ProjectPlansController],
  providers: [ProjectPlansService],
})
export class ProjectPlansModule {}
