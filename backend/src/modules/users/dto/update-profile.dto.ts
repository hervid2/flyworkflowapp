import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

/** `PATCH /users/me` body — every field optional, only present ones are updated; `avatarUrl: null` clears it. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;
}
