/** `GET /reports/data-token` — never exposes the raw value, only whether one exists. */
export class DataTokenStatusDto {
  hasToken!: boolean;
  createdAt!: Date | null;
}
