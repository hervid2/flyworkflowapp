import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateMediaDto {
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsEnum(MediaType)
  type!: MediaType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  format!: string;

  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024)
  size!: number;
}
