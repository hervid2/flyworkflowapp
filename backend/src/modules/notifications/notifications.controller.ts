import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Notifications for the authenticated user, most recent first (optionally incremental via ?since=)',
  })
  findAll(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.findAll(query, user);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark one notification as read (must be its recipient)',
  })
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.notificationsService.markRead(id, user);
  }
}
