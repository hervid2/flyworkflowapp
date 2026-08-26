import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { IncidentPriority, IncidentStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

export class ListIncidentsQueryDto extends PaginationQueryDto {
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
  @IsUUID('4')
  projectId?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
