import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../../lib/s3/storage-provider.interface';
import { PresignProjectPlanUploadDto } from './dto/presign-project-plan-upload.dto';
import { CreateProjectPlanDto } from './dto/create-project-plan.dto';
import { PresignedUploadDto } from '../media/dto/presigned-upload.dto';
import {
  ProjectPlanResponseDto,
  toProjectPlanResponseDto,
} from './dto/project-plan-response.dto';
import {
  MAX_PROJECT_PLAN_SIZE_BYTES,
  projectPlanTypeFromContentType,
} from './project-plans.constants';

@Injectable()
export class ProjectPlansService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async presignUpload(
    projectId: string,
    dto: PresignProjectPlanUploadDto,
    user: AuthenticatedUser,
  ): Promise<PresignedUploadDto> {
    await this.assertProjectInOrg(projectId, user);

    if (!projectPlanTypeFromContentType(dto.contentType)) {
      throw new BadRequestException(
        `Unsupported content type: ${dto.contentType}`,
      );
    }
    if (dto.size > MAX_PROJECT_PLAN_SIZE_BYTES) {
      throw new BadRequestException(
        'File exceeds the maximum size allowed for project plans',
      );
    }

    const key = `projects/${projectId}/plans/${randomUUID()}-${sanitizeFilename(dto.filename)}`;
    return this.storage.getPresignedUploadUrl(key, dto.contentType);
  }

  async create(
    projectId: string,
    dto: CreateProjectPlanDto,
    user: AuthenticatedUser,
  ): Promise<ProjectPlanResponseDto> {
    await this.assertProjectInOrg(projectId, user);

    if (dto.size > MAX_PROJECT_PLAN_SIZE_BYTES) {
      throw new BadRequestException(
        'File exceeds the maximum size allowed for project plans',
      );
    }

    const plan = await this.prisma.projectPlan.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        format: dto.format,
        size: dto.size,
        url: dto.fileUrl,
      },
    });
    return toProjectPlanResponseDto(plan);
  }

  async list(
    projectId: string,
    user: AuthenticatedUser,
  ): Promise<ProjectPlanResponseDto[]> {
    await this.assertProjectInOrg(projectId, user);

    const plans = await this.prisma.projectPlan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return plans.map(toProjectPlanResponseDto);
  }

  async remove(planId: string, user: AuthenticatedUser): Promise<void> {
    const plan = await this.prisma.projectPlan.findUnique({
      where: { id: planId },
      include: { project: true },
    });
    if (!plan) throw new NotFoundException();
    if (user.role !== 'superadmin' && plan.project.orgId !== user.orgId) {
      throw new NotFoundException();
    }

    await this.storage.deleteObject(keyFromUrl(plan.url));
    await this.prisma.projectPlan.delete({ where: { id: plan.id } });
  }

  private async assertProjectInOrg(
    projectId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException();
    if (user.role !== 'superadmin' && project.orgId !== user.orgId) {
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
