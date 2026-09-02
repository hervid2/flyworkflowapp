import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../../lib/s3/storage-provider.interface';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import {
  PaginatedResponseDto,
  toPaginatedResponse,
} from '../../common/dto/paginated-response.dto';
import { PresignMediaUploadDto } from './dto/presign-media-upload.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { PresignedUploadDto } from './dto/presigned-upload.dto';
import { MediaResponseDto, toMediaResponseDto } from './dto/media-response.dto';
import { ListMediaQueryDto } from './dto/list-media-query.dto';
import {
  MediaGalleryItemDto,
  toMediaGalleryItemDto,
} from './dto/media-gallery-item.dto';
import {
  MAX_MEDIA_SIZE_BYTES,
  mediaTypeFromContentType,
} from './media.constants';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async presignUpload(
    dto: PresignMediaUploadDto,
    user: AuthenticatedUser,
  ): Promise<PresignedUploadDto> {
    await this.assertIncidentInOrg(dto.incidentId, user);

    const mediaType = mediaTypeFromContentType(dto.contentType);
    if (!mediaType) {
      throw new BadRequestException(
        `Unsupported content type: ${dto.contentType}`,
      );
    }
    if (dto.size > MAX_MEDIA_SIZE_BYTES[mediaType]) {
      throw new BadRequestException(
        `File exceeds the maximum size allowed for ${mediaType}`,
      );
    }

    const key = `incidents/${dto.incidentId}/${randomUUID()}-${sanitizeFilename(dto.filename)}`;
    return this.storage.getPresignedUploadUrl(key, dto.contentType);
  }

  async create(
    incidentId: string,
    dto: CreateMediaDto,
    user: AuthenticatedUser,
  ): Promise<MediaResponseDto> {
    await this.assertIncidentInOrg(incidentId, user);

    if (dto.size > MAX_MEDIA_SIZE_BYTES[dto.type]) {
      throw new BadRequestException(
        `File exceeds the maximum size allowed for ${dto.type}`,
      );
    }

    const media = await this.prisma.media.create({
      data: {
        incidentId,
        name: dto.name,
        type: dto.type,
        format: dto.format,
        size: dto.size,
        status: 'uploaded',
        url: dto.fileUrl,
      },
    });
    return toMediaResponseDto(media);
  }

  /** Paginated media gallery across every non-deleted incident in the caller's org (roadmap 8.4). */
  async list(
    query: ListMediaQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<MediaGalleryItemDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.MediaWhereInput = {
      incident: { orgId: user.orgId, deleted: false },
      ...(query.type?.length ? { type: { in: query.type } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        include: { incident: { include: { project: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.media.count({ where }),
    ]);

    return toPaginatedResponse(
      items.map((m) =>
        toMediaGalleryItemDto({
          ...m,
          incident: {
            id: m.incident.id,
            sequenceId: m.incident.sequenceId,
            title: m.incident.title,
            project: { id: m.incident.project.id, name: m.incident.project.name },
          },
        }),
      ),
      total,
      page,
      pageSize,
    );
  }

  async remove(mediaId: string, user: AuthenticatedUser): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: { incident: true },
    });
    if (!media) throw new NotFoundException();
    if (user.role !== 'superadmin' && media.incident.orgId !== user.orgId) {
      throw new NotFoundException();
    }
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdmin && media.incident.ownerId !== user.id) {
      throw new ForbiddenException();
    }

    await this.storage.deleteObject(keyFromUrl(media.url));
    await this.prisma.media.delete({ where: { id: media.id } });
  }

  private async assertIncidentInOrg(
    incidentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident || incident.deleted) throw new NotFoundException();
    if (user.role !== 'superadmin' && incident.orgId !== user.orgId) {
      throw new NotFoundException();
    }
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Recovers the S3 object key from a `fileUrl` produced by `S3StorageProvider`. */
function keyFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}
