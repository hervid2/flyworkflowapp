import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { IncidentPriority, IncidentStatus } from '@prisma/client';

function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/**
 * `GET /reports/dashboard-data` — public route, so `token` travels as a
 * regular query param and is validated/read like any other field rather than
 * via `Authorization`/`CurrentUser` (this endpoint has no session).
 */
export class DashboardDataQueryDto {
  // Optional at the validation layer so a missing token reaches the service
  // as a normal "invalid token" case (401), not a 400 validation error.
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(IncidentStatus, { each: true })
  status?: IncidentStatus[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(IncidentPriority, { each: true })
  priority?: IncidentPriority[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  typeKey?: string[];

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
