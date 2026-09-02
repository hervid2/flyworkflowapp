import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  NotificationResponseDto,
  toNotificationResponseDto,
} from './dto/notification-response.dto';
import { NOTIFICATIONS_LIST_LIMIT } from './notifications.constants';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /notifications?since=` — own notifications only, most recent first (requirements.md §1.5). */
  async findAll(
    query: ListNotificationsQueryDto,
    user: AuthenticatedUser,
  ): Promise<NotificationResponseDto[]> {
    const where: Prisma.NotificationWhereInput = { recipientId: user.id };
    if (query.since) where.createdAt = { gt: new Date(query.since) };

    const notifications = await this.prisma.notification.findMany({
      where,
      include: { incident: { include: { project: true } } },
      orderBy: { createdAt: 'desc' },
      // Incremental polls (`since` set) want every new row; the initial load is capped.
      ...(query.since ? {} : { take: NOTIFICATIONS_LIST_LIMIT }),
    });

    return notifications.map((n) =>
      toNotificationResponseDto({
        id: n.id,
        type: n.type,
        readAt: n.readAt,
        createdAt: n.createdAt,
        incident: {
          id: n.incident.id,
          sequenceId: n.incident.sequenceId,
          title: n.incident.title,
          project: {
            id: n.incident.project.id,
            name: n.incident.project.name,
          },
        },
      }),
    );
  }

  /** `PATCH /notifications/:id/read` — 404 unknown/other-org, 403 belongs to a colleague, idempotent otherwise. */
  async markRead(id: string, user: AuthenticatedUser): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (
      !notification ||
      (user.role !== 'superadmin' && notification.orgId !== user.orgId)
    ) {
      throw new NotFoundException();
    }
    if (notification.recipientId !== user.id) {
      throw new ForbiddenException();
    }
    if (!notification.readAt) {
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
  }

  /**
   * Fires a notification row for every recipient except the actor who
   * triggered it (nobody needs to be told about their own action). Best
   * effort, mirroring `AuditLogInterceptor`: a failure here must never fail
   * the incident mutation it's attached to.
   */
  async notify(
    orgId: string,
    incidentId: string,
    recipientIds: string[],
    actorId: string,
    type: NotificationType,
  ): Promise<void> {
    const recipients = [...new Set(recipientIds)].filter(
      (id) => id !== actorId,
    );
    if (recipients.length === 0) return;

    try {
      await this.prisma.notification.createMany({
        data: recipients.map((recipientId) => ({
          orgId,
          incidentId,
          recipientId,
          type,
        })),
      });
    } catch {
      // Best-effort: notifications must never block the underlying mutation.
    }
  }
}
