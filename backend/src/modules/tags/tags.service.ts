import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagResponseDto, toTagResponseDto } from './dto/tag-response.dto';

/**
 * `roadmap.md` F5.6 calls this a "hierarchical" tags module, but the
 * persisted `Tag` model (schema.prisma, data-model.md) is flat — no
 * `parentId`. Implemented flat to match the schema that's actually shipped
 * (F3.3) and the flat `Tag { id, name, color }` shape the frontend already
 * renders; introducing hierarchy now would mean a schema migration with no
 * consumer for it yet. Flagged for a product decision before Phase 8.
 */
@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: { orgId: user.orgId },
    });
    return tags.map(toTagResponseDto);
  }

  async create(
    dto: CreateTagDto,
    user: AuthenticatedUser,
  ): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.create({
      data: { orgId: user.orgId, name: dto.name, color: dto.color },
    });
    return toTagResponseDto(tag);
  }

  async update(
    id: string,
    dto: UpdateTagDto,
    user: AuthenticatedUser,
  ): Promise<TagResponseDto> {
    const tag = await this.findScoped(id, user);
    const updated = await this.prisma.tag.update({
      where: { id: tag.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
    return toTagResponseDto(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const tag = await this.findScoped(id, user);
    // IncidentTag.tagId cascades on delete (schema.prisma) — no separate
    // "still referenced" guard needed, unlike Project -> Incident.
    await this.prisma.tag.delete({ where: { id: tag.id } });
  }

  private async findScoped(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; orgId: string; name: string; color: string }> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException();
    if (user.role !== 'superadmin' && tag.orgId !== user.orgId) {
      throw new NotFoundException();
    }
    return tag;
  }
}
