import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import {
  PaginatedResponseDto,
  toPaginatedResponse,
} from '../../common/dto/paginated-response.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AuditLogResponseDto,
  toAuditLogResponseDto,
} from './dto/audit-log-response.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AuditLogQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.AuditLogWhereInput = { orgId: user.orgId };
    if (query.userId) where.actorId = query.userId;
    if (query.projectId) where.incident = { projectId: query.projectId };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: true, incident: { include: { project: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return toPaginatedResponse(
      items.map(toAuditLogResponseDto),
      total,
      page,
      pageSize,
    );
  }
}
