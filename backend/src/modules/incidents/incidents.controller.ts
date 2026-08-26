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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents-query.dto';
import { IncidentResponseDto } from './dto/incident-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Incident detail' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    return this.incidentsService.findOne(id, user);
  }

  @Post()
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete (author or admin+)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.incidentsService.remove(id, user);
  }
}
