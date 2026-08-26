import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Prisma, type AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit.decorator';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface AuditableRequest {
  user?: AuthenticatedUser;
  params: Record<string, string>;
  body?: unknown;
}

/**
 * Writes an `AuditLog` row for every route tagged `@Audit(...)`, once the
 * handler succeeds — data-model.md: "a NestJS interceptor writes here on
 * every relevant mutation". The write is awaited (not fire-and-forget) so
 * it can't be dropped by a Lambda execution environment frozen right after
 * the response is sent, and so tests can assert on it deterministically;
 * a failed audit write is swallowed rather than failing the user's request.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const configured = this.reflector.get<
      AuditAction | 'dynamic-approval' | undefined
    >(AUDIT_ACTION_KEY, context.getHandler());
    if (!configured) return next.handle();

    const request = context.switchToHttp().getRequest<AuditableRequest>();

    return next.handle().pipe(
      switchMap(async (result: unknown) => {
        await this.writeAuditLog(configured, request, result);
        return result;
      }),
    );
  }

  private async writeAuditLog(
    configured: AuditAction | 'dynamic-approval',
    request: AuditableRequest,
    result: unknown,
  ): Promise<void> {
    const user = request.user;
    if (!user) return;

    const incidentId = extractIncidentId(result, request.params);
    if (!incidentId) return;

    const action: AuditAction =
      configured === 'dynamic-approval'
        ? resolveApprovalAction(request.body)
        : configured;

    try {
      await this.prisma.auditLog.create({
        data: {
          orgId: user.orgId,
          incidentId,
          actorId: user.id,
          action,
          metadata: buildMetadata(request.body),
        },
      });
    } catch {
      // Best-effort: the audit trail must never block the actual mutation.
    }
  }
}

function extractIncidentId(
  result: unknown,
  params: Record<string, string>,
): string | undefined {
  if (
    result &&
    typeof result === 'object' &&
    'id' in result &&
    typeof result.id === 'string'
  ) {
    return (result as { id: string }).id;
  }
  return params.id;
}

function resolveApprovalAction(body: unknown): AuditAction {
  const decision = (body as { decision?: string } | undefined)?.decision;
  return decision === 'rejected' ? 'rejected' : 'approved';
}

function buildMetadata(body: unknown): Prisma.InputJsonObject {
  if (!body || typeof body !== 'object') return {};
  return JSON.parse(JSON.stringify(body)) as Prisma.InputJsonObject;
}
