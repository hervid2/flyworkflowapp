import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PresignMediaUploadDto } from './dto/presign-media-upload.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { PresignedUploadDto } from './dto/presigned-upload.dto';
import { MediaResponseDto } from './dto/media-response.dto';
import { ListMediaQueryDto } from './dto/list-media-query.dto';
import { MediaGalleryItemDto } from './dto/media-gallery-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('media')
  @ApiOperation({
    summary:
      'Paginated media gallery across every incident in the caller organization',
  })
  list(
    @Query() query: ListMediaQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<MediaGalleryItemDto>> {
    return this.mediaService.list(query, user);
  }

  @Post('media/presign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single-use, short-lived presigned S3 upload URL',
  })
  presign(
    @Body() dto: PresignMediaUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PresignedUploadDto> {
    return this.mediaService.presignUpload(dto, user);
  }

  @Post('incidents/:id/media')
  @ApiOperation({
    summary: 'Record a media attachment already uploaded to S3',
  })
  create(
    @Param('id') incidentId: string,
    @Body() dto: CreateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaResponseDto> {
    return this.mediaService.create(incidentId, dto, user);
  }

  @Delete('media/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a media attachment (author or admin+), removing the S3 object too',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.mediaService.remove(id, user);
  }
}
