# Data Model — FlyWorkFlow

> Reference document, versioned alongside the code. Last updated: 2026-08-20.
> Source of truth for entities until `backend/prisma/schema.prisma` exists (task F3.3 in `roadmap.md`) — from that point on, the real schema rules and this document updates to follow it, not the other way around. Undefined terms here are in `glossary.md`.

Entities marked **[frontend]** already exist today as TypeScript types in `src/domain/models/incident.model.ts` and are only migrated to Prisma. Entities marked **[new]** have no equivalent in the current frontend — they're born with the backend.

---

## Organization **[new]**

Root of multi-tenancy — everything else hangs off an organization.

| Field       | Type     | Notes                          |
| ----------- | -------- | ------------------------------ |
| `id`        | uuid     | PK                             |
| `name`      | string   | Visible name in TopBar/reports |
| `createdAt` | datetime |                                |

---

## User **[new]**

| Field          | Type                                | Notes                                   |
| -------------- | ----------------------------------- | --------------------------------------- |
| `id`           | uuid                                | PK                                      |
| `orgId`        | uuid                                | FK → `Organization`                     |
| `name`         | string                              |                                         |
| `email`        | string                              | unique                                  |
| `passwordHash` | string                              | bcrypt — never a plaintext password     |
| `role`         | enum(`member`,`admin`,`superadmin`) | `superadmin` is cross-org (§1.6 Should) |
| `avatarUrl`    | string?                             |                                         |
| `createdAt`    | datetime                            |                                         |

`UserRef` (the lightweight shape already used in `incident.model.ts` for `owner`/`assignees`/`observers`: `{ id, name, email, avatarUrl? }`) is a projection of `User`, not its own entity — the backend assembles it when serializing, it isn't persisted separately.

---

## Project **[frontend → persisted]**

| Field       | Type     | Notes               |
| ----------- | -------- | ------------------- |
| `id`        | uuid     | PK                  |
| `orgId`     | uuid     | FK → `Organization` |
| `name`      | string   |                     |
| `createdAt` | datetime |                     |

---

## IncidentType **[frontend → persisted]**

A shared catalog, not organization-dependent — the 15 keys are the same for every tenant.

| Field    | Type   | Notes                                                          |
| -------- | ------ | -------------------------------------------------------------- |
| `id`     | uuid   | PK                                                             |
| `key`    | string | unique, e.g. `plumbing` — what `typeKey` references in filters |
| `name`   | string | Spanish display name                                           |
| `nameEn` | string | English name (i18n, §1.9)                                      |

---

## Incident **[frontend → persisted, with new fields]**

The central entity. Fields already typed in `incident.model.ts` are kept; the ones that today only exist in the mock JSON without a formal type are added, along with scoping/backend fields.

| Field                 | Type                                  | Notes                                                                                                                                            |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                  | uuid                                  | PK                                                                                                                                               |
| `sequenceId`          | string                                | display code, e.g. `"0042"`                                                                                                                      |
| `orgId`               | uuid                                  | FK → `Organization` — denormalized onto the row itself so every listing query filters without an extra JOIN (§1.6 Must)                          |
| `projectId`           | uuid                                  | FK → `Project`                                                                                                                                   |
| `typeId`              | uuid                                  | FK → `IncidentType`                                                                                                                              |
| `title`               | string                                |                                                                                                                                                  |
| `description`         | string                                |                                                                                                                                                  |
| `priority`            | enum(`high`,`medium`,`low`)           | already typed in the frontend                                                                                                                    |
| `status`              | enum(`open`,`on_pause`,`closed`)      | already typed in the frontend                                                                                                                    |
| `approval`            | enum(`pending`,`approved`,`rejected`) | **changes from `boolean` to an enum** when the real workflow is built (§1.2 Should) — a boolean can't distinguish "not reviewed" from "rejected" |
| `ownerId`             | uuid                                  | FK → `User`                                                                                                                                      |
| `deleted`             | boolean                               | default `false` — today lives in the mock JSON with no formal type (`'deleted' in i`); formalized as a real column (§1.2 Should, trash)          |
| `whatsappOwner`       | string?                               | present in the current mock with no use; pending decision in `roadmap.md` Phase 1 — adopt it with a real type or drop it from the schema         |
| `coordinates`         | `{ lat, lng }`?                       | embedded, not a relation                                                                                                                         |
| `locationDescription` | string?                               |                                                                                                                                                  |
| `dueDate`             | datetime?                             |                                                                                                                                                  |
| `closingDate`         | datetime?                             |                                                                                                                                                  |
| `createdAt`           | datetime                              |                                                                                                                                                  |
| `updatedAt`           | datetime                              |                                                                                                                                                  |

**Many-to-many relationships**: `assignees` and `observers` (both against `User`) need their own join tables — `IncidentAssignee(incidentId, userId)` and `IncidentObserver(incidentId, userId)` — because a user can hold both roles on different incidents. `tags` uses `IncidentTag(incidentId, tagId)`.

---

## Tag **[frontend → persisted]**

| Field   | Type   | Notes                                                         |
| ------- | ------ | ------------------------------------------------------------- |
| `id`    | uuid   | PK                                                            |
| `orgId` | uuid   | FK → `Organization` — tags aren't shared across organizations |
| `name`  | string |                                                               |
| `color` | string | hex, already used for chips in the frontend                   |

---

## Media **[frontend → persisted]**

| Field        | Type                               | Notes                                            |
| ------------ | ---------------------------------- | ------------------------------------------------ |
| `id`         | uuid                               | PK                                               |
| `incidentId` | uuid                               | FK → `Incident`                                  |
| `name`       | string                             |                                                  |
| `type`       | enum(`image`,`video`,`document`)   | already typed in the frontend                    |
| `format`     | string                             | extension/mime                                   |
| `size`       | int                                | bytes — also validated server-side (§1.7 Should) |
| `status`     | enum(`uploaded`,`pending`,`error`) | already typed in the frontend                    |
| `url`        | string                             | S3 URL, never `blob:`                            |
| `createdAt`  | datetime                           |                                                  |

---

## RefreshToken **[new]**

| Field       | Type      | Notes                                                                  |
| ----------- | --------- | ---------------------------------------------------------------------- |
| `id`        | uuid      | PK                                                                     |
| `userId`    | uuid      | FK → `User`                                                            |
| `tokenHash` | string    | the token is never stored in clear text                                |
| `expiresAt` | datetime  |                                                                        |
| `revokedAt` | datetime? | set on logout — the row isn't deleted, it stays as proof of revocation |
| `createdAt` | datetime  |                                                                        |

---

## AuditLog **[new]**

See the full flow in the target-architecture artifact — a NestJS interceptor writes here on every relevant mutation.

| Field        | Type                                                                                  | Notes                                                           |
| ------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `id`         | uuid                                                                                  | PK                                                              |
| `orgId`      | uuid                                                                                  | FK → `Organization`                                             |
| `incidentId` | uuid                                                                                  | FK → `Incident`                                                 |
| `actorId`    | uuid                                                                                  | FK → `User` — who made the change                               |
| `action`     | enum(`created`,`updated`,`status_changed`,`approved`,`rejected`,`deleted`,`restored`) |                                                                 |
| `metadata`   | jsonb                                                                                 | a minimal diff of the change (field, previous value, new value) |
| `createdAt`  | datetime                                                                              |                                                                 |

---

## Notification **[new]**

| Field         | Type                                           | Notes                                                                                                |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`          | uuid                                           | PK                                                                                                   |
| `orgId`       | uuid                                           | FK → `Organization`                                                                                  |
| `recipientId` | uuid                                           | FK → `User`                                                                                          |
| `incidentId`  | uuid                                           | FK → `Incident`                                                                                      |
| `type`        | enum(`assignment`,`status_changed`,`approval`) | a subset of `AuditLog.action` — not every mutation generates a notification, only these three (§1.5) |
| `readAt`      | datetime?                                      | `null` = unread                                                                                      |
| `createdAt`   | datetime                                       |                                                                                                      |

---

## Expected indexes (see `best-practices.md §Prisma / SQL`)

`Incident(orgId, status)`, `Incident(orgId, createdAt)`, `AuditLog(incidentId)`, `Notification(recipientId, readAt)` — the four combinations that `api-contracts.md`'s endpoints filter or sort on most often.
