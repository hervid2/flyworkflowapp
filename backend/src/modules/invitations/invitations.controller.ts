import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { InvitationsService } from './invitations.service';
import { AuthService } from '../auth/auth.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { InvitationPreviewDto } from './dto/invitation-preview.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { setRefreshCookie } from '../../common/utils/refresh-cookie.util';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Invite a collaborator to the organization — functional reinterpretation of the "Share" button',
  })
  create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.create(dto, user);
  }

  @Get()
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List the organization's invitations, most recent first",
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvitationResponseDto[]> {
    return this.invitationsService.findAll(user);
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revoke(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.invitationsService.revoke(id, user);
  }

  @Get('token/:token')
  @Public()
  @ApiOperation({
    summary:
      'Preview an invitation by its raw token (backs the /invitar accept page)',
  })
  preview(@Param('token') token: string): Promise<InvitationPreviewDto> {
    return this.invitationsService.preview(token);
  }

  @Post('token/:token/accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept an invitation, creating the account and starting a session',
  })
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const user = await this.invitationsService.accept(token, dto);
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
    };
    const { accessToken, refreshToken } =
      await this.authService.login(authenticatedUser);
    setRefreshCookie(res, refreshToken, this.configService);
    return { accessToken };
  }
}
