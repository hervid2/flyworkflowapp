import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ProjectResponseDto,
  toProjectResponseDto,
} from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: 'asc' },
    });
    return projects.map(toProjectResponseDto);
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const project = await this.findScoped(id, user);
    return toProjectResponseDto(project);
  }

  async create(
    dto: CreateProjectDto,
    user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: { orgId: user.orgId, name: dto.name },
    });
    return toProjectResponseDto(project);
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const project = await this.findScoped(id, user);
    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: { name: dto.name },
    });
    return toProjectResponseDto(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const project = await this.findScoped(id, user);
    try {
      await this.prisma.project.delete({ where: { id: project.id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a project that still has incidents',
        );
      }
      throw error;
    }
  }

  /**
   * A project's own id isn't an organization id, so `OrgScopeGuard` doesn't
   * apply here — scoping is a manual orgId match instead, mirroring its same
   * 404-not-403 convention. `superadmin` bypasses the match (cross-org
   * oversight), same as `OrgScopeGuard`.
   */
  private async findScoped(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; orgId: string; name: string; createdAt: Date }> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();
    if (user.role !== 'superadmin' && project.orgId !== user.orgId) {
      throw new NotFoundException();
    }
    return project;
  }
}
