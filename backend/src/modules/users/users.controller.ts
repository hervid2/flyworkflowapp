import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  toUserProfileDto,
  UserProfileDto,
} from '../../common/dto/user-profile.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Return the authenticated user's own profile" })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    const record = await this.usersService.findById(user.id);
    if (!record) {
      throw new NotFoundException();
    }
    return toUserProfileDto(record);
  }
}
