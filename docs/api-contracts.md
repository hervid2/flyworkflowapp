# API Contracts — FlyWorkFlow

> Reference document, versioned alongside the code. Last updated: 2026-08-20.
> This is the contract the backend implements — written before the code, not generated after. `@nestjs/swagger` produces browsable OpenAPI documentation from the same DTOs (`best-practices.md §Code Documentation`); that page is for exploring the API once it's built, but if it diverges from this document, this is where it's decided which of the two is out of date. Entities and fields in `data-model.md`, terms in `glossary.md`.

## Conventions

- **Auth**: `Authorization: Bearer <accessToken>` on every protected route, except `/auth/login` and `/auth/refresh`. The refresh token only travels via the `httpOnly` cookie, never in the body.
- **Scoping**: no protected route receives `orgId` as a parameter — it always comes from the JWT. An `orgId` in the body or URL is ignored or rejected, never used to decide what data to return.
- **Pagination**: `?page=1&pageSize=20` (default `pageSize=20`, max `100`); response `{ items: [...], total, page, pageSize }`.
- **Errors**: NestJS's standard shape — `{ statusCode, message, error }`. `message` is a string or an array of strings (`class-validator` validation errors, one per field).
- **Codes used consistently**: `400` invalid payload, `401` no session or expired token, `403` valid session without permission for this action, `404` the resource doesn't exist _or_ belongs to another organization (same code for both cases — never reveals that the resource exists in another tenant), `409` state conflict (e.g. closing an already-closed incident), `429` rate limit.

---

## Auth (`requirements.md §1.1`)

| Method and route       | Auth                  | Request                            | Response                                                  | Errors                                              |
| ---------------------- | --------------------- | ---------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `POST /auth/login`     | public                | `{ email, password }`              | `200 { accessToken }` + `Set-Cookie refreshToken`         | `401` invalid credentials · `429` strict rate limit |
| `POST /auth/refresh`   | `refreshToken` cookie | —                                  | `200 { accessToken }` + rotated `Set-Cookie refreshToken` | `401` cookie missing, expired or revoked            |
| `POST /auth/logout`    | Bearer                | —                                  | `204` — revokes the refresh token in the DB               | `401`                                               |
| `PATCH /auth/password` | Bearer                | `{ currentPassword, newPassword }` | `204`                                                     | `400` weak password · `401` wrong current password  |

## Incidents (`requirements.md §1.2`)

| Method and route                | Auth                                  | Request                                                                                 | Response                                     | Errors                                                 |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `GET /incidents`                | Bearer                                | query: `page, pageSize, status[], priority[], typeKey[], companyId[], dateFrom, dateTo` | `200` a page of incidents, scoped by `orgId` | `400` invalid filters                                  |
| `POST /incidents`               | Bearer                                | `CreateIncidentDto` (no `owner`/`orgId` — come from the JWT)                            | `201` incident created                       | `400` validation                                       |
| `GET /incidents/:id`            | Bearer                                | —                                                                                       | `200` detail                                 | `404` doesn't exist or belongs to another organization |
| `PATCH /incidents/:id`          | Bearer, author/assignee/admin         | partial editable fields                                                                 | `200` updated                                | `403` no permission · `404`                            |
| `PATCH /incidents/:id/status`   | Bearer, author/assignee/admin         | `{ status }`                                                                            | `200`                                        | `409` invalid transition                               |
| `PATCH /incidents/:id/approval` | Bearer, role with approval permission | `{ decision: 'approved' \| 'rejected', reason? }`                                       | `200`                                        | `403` no permission                                    |
| `DELETE /incidents/:id`         | Bearer, author/admin                  | —                                                                                       | `204` — soft delete (`deleted = true`)       | `403` · `404`                                          |
| `GET /incidents/trash`          | Bearer, admin                         | query: `page, pageSize`                                                                 | `200` a page of soft-deleted incidents       | `403` no permission                                    |
| `POST /incidents/:id/restore`   | Bearer, admin                         | —                                                                                       | `200` restored                               | `404` not in trash                                     |

## Incident types

Added in Phase 7 (F7.2): the frontend has no other way to discover the `typeId` UUIDs `POST /incidents` requires.

| Method and route      | Auth   | Request | Response                                                                      | Errors |
| --------------------- | ------ | ------- | ----------------------------------------------------------------------------- | ------ |
| `GET /incident-types` | Bearer | —       | `200` the shared 15-row catalog (`{id, key, name, nameEn}[]`), not org-scoped | —      |

## Media (`requirements.md §1.7`)

| Method and route            | Auth   | Request                                       | Response                                                                                                                                                                                                                                                         | Errors                                   |
| --------------------------- | ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `GET /media`                | Bearer | query: `page, pageSize, type[]`               | `200` a page of media across every non-deleted incident, scoped by `orgId`, each item carrying a lightweight incident ref (`{id, sequenceId, title, project}`) — backs the `/galeria` (image/video, roadmap 8.4) and `/documentos` (document, roadmap 8.5) pages | —                                        |
| `POST /media/presign`       | Bearer | `{ incidentId, filename, contentType, size }` | `200 { uploadUrl, fileUrl }` — single-use URL                                                                                                                                                                                                                    | `400` disallowed type or size            |
| `POST /incidents/:id/media` | Bearer | `{ fileUrl, name, type, format, size }`       | `201` media record created                                                                                                                                                                                                                                       | `400` type/size rejected server-side too |

## Organizations / Projects (`requirements.md §1.6`)

| Method and route                 | Auth           | Request    | Response                                               | Errors                   |
| -------------------------------- | -------------- | ---------- | ------------------------------------------------------ | ------------------------ |
| `GET /users/me`                  | Bearer         | —          | `200` profile + `orgId` + `role`                       | `401`                    |
| `GET /organizations/:id/members` | Bearer         | —          | `200` member list (own organization unless superadmin) | `404` other organization |
| `GET /projects`                  | Bearer         | —          | `200` the organization's projects                      | —                        |
| `POST /projects`                 | Bearer, admin+ | `{ name }` | `201`                                                  | `403`                    |

## Notifications (`requirements.md §1.5`)

| Method and route                | Auth                              | Request                                   | Response                      | Errors        |
| ------------------------------- | --------------------------------- | ----------------------------------------- | ----------------------------- | ------------- |
| `GET /notifications`            | Bearer                            | query: `since?` (for incremental polling) | `200` list, most recent first | —             |
| `PATCH /notifications/:id/read` | Bearer, owner of the notification | —                                         | `204`                         | `403` · `404` |

## Audit / History (`requirements.md §1.8`)

| Method and route | Auth           | Request                            | Response                                                                                                                                                                                                       | Errors |
| ---------------- | -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `GET /audit-log` | Bearer, admin+ | query: `projectId?, userId?, page` | `200` a page of events, scoped by `orgId`; each entry includes `incident: { id, sequenceId, title, project }` alongside `actor` (F8.1 — the `/historial` page renders these without a per-row incident lookup) | `403`  |

## Reports (`requirements.md §1.10`)

| Method and route              | Auth                                                  | Request                               | Response                                                                      | Errors              |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- | ------------------- |
| `GET /incidents/export.csv`   | Bearer                                                | same query params as `GET /incidents` | `200` streamed CSV                                                            | `400`               |
| `GET /reports/dashboard-data` | long-lived data token (distinct from the session one) | query: dashboard filters              | `200 JSON` — meant for Power BI's "Web"/"From URL" connector or Looker Studio | `401` invalid token |
