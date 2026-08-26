import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from '@prisma/client';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * Marks a mutating route for `AuditLogInterceptor`. `'dynamic-approval'` is
 * for the one route (`PATCH /incidents/:id/approval`) where the real action
 * (`approved` vs `rejected`) is only known from the request body at runtime.
 */
export const Audit = (action: AuditAction | 'dynamic-approval') =>
  SetMetadata(AUDIT_ACTION_KEY, action);
