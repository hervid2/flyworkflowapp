import { IncidentStatus } from '@prisma/client';

/**
 * Same-state "transitions" are rejected (409) rather than treated as no-ops —
 * `api-contracts.md` reserves 409 for state conflicts. `closed -> open`
 * (reopen) is allowed; there's no terminal state.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  IncidentStatus,
  IncidentStatus[]
> = {
  open: ['on_pause', 'closed'],
  on_pause: ['open', 'closed'],
  closed: ['open'],
};

export const INCIDENT_SEQUENCE_ID_LENGTH = 4;
