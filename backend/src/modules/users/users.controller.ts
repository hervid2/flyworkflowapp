import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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

  @Patch('me')
  @ApiOperation({
    summary: "Update the authenticated user's own profile (name, avatar)",
  })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return toUserProfileDto(updated);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the authenticated user's own password" })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(user.id, dto);
  }
}
