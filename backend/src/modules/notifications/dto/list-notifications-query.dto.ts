import { IsISO8601, IsOptional } from 'class-validator';

/** `GET /notifications?since=` — `since` (ISO 8601) powers incremental polling; omitted for the initial load. */
export class ListNotificationsQueryDto {
  @IsOptional()
  @IsISO8601()
  since?: string;
}
