import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectPlanDto {
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsIn(['image', 'document'])
  type!: 'image' | 'document';

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  format!: string;

  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  size!: number;
}
