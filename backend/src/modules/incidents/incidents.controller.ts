import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { UpdateIncidentApprovalDto } from './dto/update-incident-approval.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents-query.dto';
import { IncidentResponseDto } from './dto/incident-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@ApiTags('incidents')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Paginated, filtered list of incidents in the caller organization',
  })
  findAll(
    @Query() query: ListIncidentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<IncidentResponseDto>> {
    return this.incidentsService.findAll(query, user);
  }

  // Must stay ahead of `:id` below — otherwise "export.csv"/"trash" are parsed as an id.
  @Get('export.csv')
  @ApiOperation({
    summary:
      "CSV export of the caller's filtered incidents (roadmap 8.10, requirements.md §1.10)",
  })
  async exportCsv(
    @Query() query: ListIncidentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const csv = await this.incidentsService.exportCsv(query, user);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="incidents.csv"',
    });
    return csv;
  }

  @Get('trash')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Paginated list of soft-deleted incidents (admin+)',
  })
  findTrash(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<IncidentResponseDto>> {
    return this.incidentsService.findTrash(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Incident detail' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.findOne(id, user);
  }

  @Post()
  @Audit('created')
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Create an incident owned by the authenticated user',
  })
  create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.create(dto, user);
  }

  @Patch(':id')
  @Audit('updated')
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Update editable fields (author, assignee or admin+)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Audit('status_changed')
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Change status following the allowed transition graph',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.updateStatus(id, dto, user);
  }

  @Patch(':id/approval')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Audit('dynamic-approval')
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Approve or reject a pending incident (admin+)' })
  updateApproval(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.updateApproval(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit('deleted')
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Soft delete (author or admin+)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.incidentsService.remove(id, user);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Audit('restored')
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Restore a soft-deleted incident out of the trash (admin+)',
  })
  restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.restore(id, user);
  }
}
