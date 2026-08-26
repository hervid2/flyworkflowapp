import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIncidentApprovalDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
