import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectPlansService } from './project-plans.service';
import { PresignProjectPlanUploadDto } from './dto/presign-project-plan-upload.dto';
import { CreateProjectPlanDto } from './dto/create-project-plan.dto';
import { ProjectPlanResponseDto } from './dto/project-plan-response.dto';
import { PresignedUploadDto } from '../media/dto/presigned-upload.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('project-plans')
@ApiBearerAuth()
@Controller()
export class ProjectPlansController {
  constructor(private readonly projectPlansService: ProjectPlansService) {}

  @Get('projects/:id/plans')
  @ApiOperation({ summary: 'List the plans attached to a project (image/PDF)' })
  list(
    @Param('id') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectPlanResponseDto[]> {
    return this.projectPlansService.list(projectId, user);
  }

  @Post('projects/:id/plans/presign')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get a presigned S3 upload URL for a project plan (admin+)',
  })
  presign(
    @Param('id') projectId: string,
    @Body() dto: PresignProjectPlanUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PresignedUploadDto> {
    return this.projectPlansService.presignUpload(projectId, dto, user);
  }

  @Post('projects/:id/plans')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Record a project plan already uploaded to S3 (admin+)',
  })
  create(
    @Param('id') projectId: string,
    @Body() dto: CreateProjectPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectPlanResponseDto> {
    return this.projectPlansService.create(projectId, dto, user);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Delete a project plan, removing the S3 object too (admin+)',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.projectPlansService.remove(id, user);
  }
}
