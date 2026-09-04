import { IsString, Length, MinLength } from 'class-validator';

/** `POST /invitations/token/:token/accept` body — the invitee sets their own name and password. */
export class AcceptInvitationDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
