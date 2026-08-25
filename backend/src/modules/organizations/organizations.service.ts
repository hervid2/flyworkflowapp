import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toUserProfileDto,
  UserProfileDto,
} from '../../common/dto/user-profile.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMembers(orgId: string): Promise<UserProfileDto[]> {
    const members = await this.prisma.user.findMany({ where: { orgId } });
    return members.map(toUserProfileDto);
  }
}
