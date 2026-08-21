# Glossary — FlyWorkFlow

> Reference document, versioned alongside the code. Last updated: 2026-08-20.
> Domain and process terms used in `requirements.md`, `roadmap.md` and `best-practices.md` without being defined where they appear. Doesn't repeat concepts already explained in `data-model.md` or `api-contracts.md`, only points to where to expand on them.

## Incident domain

| Term              | Meaning                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incident**      | A geolocated field report (fault, finding, task) within a project. The product's central entity — see `data-model.md §Incident`.                                                                                 |
| **owner**         | The user who created the incident. Different from `assignees` (who must resolve it) and `observers` (who only follow it).                                                                                        |
| **status**        | Lifecycle state: `open` → `on_pause` → `closed`. Not to be confused with `approval`.                                                                                                                             |
| **approval**      | Whether the incident was reviewed and approved by an authorized role. It's a workflow independent of `status` — an incident can be `closed` without being approved.                                              |
| **deleted**       | Soft-delete flag. The record still exists in the database but is excluded from normal views; it lives in the trash until restored. Never a physical `DELETE`.                                                    |
| **riskFilter**    | A quick filter on the dashboard's critical incidents table, with values like `overdueToday` (due today) or `staleSince7d` (no movement for 7+ days) — distinct from the general status/priority/company filters. |
| **typeKey**       | The short key of an incident type from the catalog (e.g. `plumbing`), used for filtering and as a foreign key — the display name (`name`/`name_en`) is only for showing.                                         |
| **whatsappOwner** | A field present in the current mock dataset but unused by any screen or endpoint. `roadmap.md` Phase 1 decides whether it's formalized or dropped before the real data model inherits it.                        |

## Authentication, organizations and permissions

| Term              | Meaning                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **orgId**         | The identifier of the organization a user or resource belongs to. It's the axis of multi-tenancy: every backend query uses it to avoid mixing data across organizations — see `requirements.md §1.6`. |
| **RBAC**          | _Role-Based Access Control_ — what a user can do based on their role (`member`, `admin`, `superadmin`), enforced on the backend with guards, not as a UI label.                                       |
| **JWT**           | _JSON Web Token_ — the access token's format: signed, short expiration, carries `userId`/`orgId`/`role`.                                                                                              |
| **access token**  | A short-lived token the client sends on every request (`Authorization: Bearer`). Lives in browser memory, never in `localStorage`.                                                                    |
| **refresh token** | A long-lived token used only to request a new access token without logging in again. Lives in an `httpOnly` cookie, invisible to browser JavaScript.                                                  |
| **presigned URL** | A temporary, single-use URL that S3 issues to allow a direct upload (`PUT`) from the browser, without the file passing through the backend.                                                           |

## Process and planning

| Term                                 | Meaning                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MoSCoW**                           | The priority scale used in `requirements.md §1`: **Must** (blocks the product), **Should** (expected in a comparable product), **Could** (optional improvement), **Won't (v1)** (out of scope, with an explicit reason). |
| **MVP**                              | The result of completing Phases 0–7 of the roadmap: a real backend connected end-to-end. Phases 8–9 are an optional increment on top of that point.                                                                      |
| **Traceability**                     | The relationship between a `requirements.md` requirement and the `roadmap.md` task that implements it — see the table at the end of `roadmap.md`.                                                                        |
| **DTO**                              | _Data Transfer Object_ — the shape of data going in or out of an endpoint, validated with `class-validator` on the backend and with Zod on the frontend.                                                                 |
| **Guard** / **interceptor** (NestJS) | A guard decides whether a request can proceed (authentication, role, organization); an interceptor wraps execution to do something around it without every service repeating it (e.g. writing an audit entry).           |
| **cold start**                       | The extra latency of a Lambda function's first invocation after being idle. Documented as acceptable given the project has no constant traffic — see `requirements.md §2 Availability`.                                  |
