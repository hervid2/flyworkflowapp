import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { MediaType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

export class ListMediaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(MediaType, { each: true })
  type?: MediaType[];
}
