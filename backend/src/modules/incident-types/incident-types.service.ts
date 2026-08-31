import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IncidentTypeResponseDto,
  toIncidentTypeResponseDto,
} from './dto/incident-type-response.dto';

/** Shared catalog, not org-scoped (data-model.md) — the same 15 keys, seeded once, for every tenant. */
@Injectable()
export class IncidentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<IncidentTypeResponseDto[]> {
    const types = await this.prisma.incidentType.findMany({
      orderBy: { name: 'asc' },
    });
    return types.map(toIncidentTypeResponseDto);
  }
}
