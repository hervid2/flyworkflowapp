import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
  mixin,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Validates `request.body` against `dto` and rejects with 400 before any
 * later guard runs. Needed specifically because Nest resolves guards before
 * argument-binding pipes (`ValidationPipe` never gets a turn ahead of, say,
 * `LocalAuthGuard` on `/auth/login` — a malformed body would otherwise reach
 * Passport's strategy first and come back as a misleading 401).
 */
export function DtoValidationGuard(dto: Type<object>) {
  @Injectable()
  class DtoValidationGuardMixin implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<{ body: unknown }>();
      const instance = plainToInstance(dto, request.body);
      const errors = await validate(instance, { whitelist: true });
      if (errors.length > 0) {
        throw new BadRequestException(
          errors.flatMap((error) => Object.values(error.constraints ?? {})),
        );
      }
      request.body = instance;
      return true;
    }
  }
  return mixin(DtoValidationGuardMixin);
}
