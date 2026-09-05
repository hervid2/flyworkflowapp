/**
 * `POST /reports/data-token` — the raw token is returned exactly once, at
 * generation time (only its hash is persisted, same convention as
 * `Invitation.tokenHash`). The frontend builds the full `dashboard-data` URL
 * itself since it already knows its own API base.
 */
export class DataTokenCreatedDto {
  token!: string;
  createdAt!: Date;
}
