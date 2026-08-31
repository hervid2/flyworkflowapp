import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import type { UserProfileDto } from '../../common/dto/user-profile.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // Any authenticated org member (not admin-only): the frontend's
  // assignee/observer picker (F7.2) needs teammates listed for every role,
  // not just admins. OrgScopeGuard alone still blocks cross-org access.
  @Get(':id/members')
  @UseGuards(OrgScopeGuard)
  @ApiOperation({
    summary:
      "List an organization's members (own organization unless superadmin)",
  })
  findMembers(@Param('id') id: string): Promise<UserProfileDto[]> {
    return this.organizationsService.findMembers(id);
  }
}
