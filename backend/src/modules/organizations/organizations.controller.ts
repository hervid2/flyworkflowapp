import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import type { UserProfileDto } from '../../common/dto/user-profile.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id/members')
  @Roles('admin')
  @UseGuards(RolesGuard, OrgScopeGuard)
  @ApiOperation({
    summary:
      "List an organization's members (admin+, own organization unless superadmin)",
  })
  findMembers(@Param('id') id: string): Promise<UserProfileDto[]> {
    return this.organizationsService.findMembers(id);
  }
}
