import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Module } from '../../lib/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
