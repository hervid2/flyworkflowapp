# Functional and Non-Functional Requirements — FlyWorkFlow

> Planning spec, versioned alongside the code (see `docs/glossary.md` for domain terms, `docs/data-model.md` for entities, and `docs/api-contracts.md` for endpoints).
> Last updated: 2026-08-20.

## 0. Summary and context

FlyWorkFlow is an incident management application for construction/maintenance projects: a geospatial map for reporting and visualizing on-site incidents, and an analytics dashboard for monitoring project status. Today there's a complete frontend (Next.js) with **100% mock data and no real backend** — this document defines what needs to become real for the application to function as a genuine product, benchmarked against market software in the same family (field CMMS/ticketing: Jira Service Management, GetMaintainX, UpKeep, Fracttal).

Every functional requirement has a MoSCoW priority:

- **Must** — without this there's no real product, it's the minimum to stop being a demo.
- **Should** — clear value, expected in a comparable market product.
- **Could** — desirable improvement, doesn't block the rest.
- **Won't (v1)** — explicitly out of scope, with its reason.

---

## 1. Functional requirements

### 1.1 Authentication and Authorization

| Priority   | Requirement                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Must       | Real login (email + password) against an API, with password hashing (bcrypt) — replaces the plaintext credential table in `auth.service.ts`. |
| Must       | JWT-based session (short-lived access token + refresh token), not an unsigned UUID.                                                          |
| Must       | Logout that revokes the refresh token on the backend, not just clears the client cookie.                                                     |
| Must       | `middleware.ts` validates the token's real signature and expiration, not just the presence of a cookie.                                      |
| Must       | Role- and organization-based authorization on every protected endpoint (real RBAC).                                                          |
| Should     | Silent access token renewal via refresh token rotation.                                                                                      |
| Should     | Authenticated password change.                                                                                                               |
| Could      | Password recovery by email (requires an external SMTP provider).                                                                             |
| Could      | Self-service sign-up for new organizations.                                                                                                  |
| Won't (v1) | Social SSO/OAuth, two-factor authentication — keeps the infrastructure footprint simple.                                                     |

### 1.2 Incident Management

| Priority   | Requirement                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Must       | Full CRUD: today only creation is simulated; editing, changing status and deleting are missing.                |
| Must       | A new incident's `owner` and `project` are taken from the real session and a project selector, not hardcoded.  |
| Must       | Full selectable incident type catalog (today it exposes 11 of the 15 types present in the data).               |
| Must       | Attachments are persisted in real storage (S3), not as ephemeral browser blob URLs.                            |
| Should     | Real approval workflow on the `approval` field (already modeled in the domain, with no UI today).              |
| Should     | Trash and restore on the `deleted` field (already modeled, today just silently filtered).                      |
| Should     | Activity/comments per incident (direct input for History, section 1.8).                                        |
| Could      | State machine with explicit transition rules (`open → on_pause → closed`).                                     |
| Could      | Attach and view project plans (image/PDF) — a realistic reinterpretation of the decorative "BIM Plans" button. |
| Won't (v1) | Native BIM/IFC file viewer — requires specialized 3D libraries, disproportionate for the project's scope.      |

### 1.3 Map

| Priority   | Requirement                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must       | The map filter bar's date filter and "last N visits" slider must actually filter markers (today it's a bug: the control writes to the store but no component reads that value to filter). |
| Should     | Real marker clustering with `supercluster` (dependency already installed, never imported).                                                                                                |
| Could      | Recenter, map layers, terrain/elevation — a prioritized subset of the map toolbar's currently decorative buttons.                                                                         |
| Won't (v1) | Historical timelapse, 360° view, real-time collaborative annotations.                                                                                                                     |

### 1.4 Dashboard / Analytics

| Priority | Requirement                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Must     | Fix the filtering bug: the company filter applies to KPIs and charts but not to the critical incidents table. |
| Must     | KPIs reflect real multi-tenancy (organization-level scoping from the backend, not just a post-hoc UI filter). |
| Should   | Export filtered table/metrics as CSV.                                                                         |
| Could    | Export dashboard as PDF.                                                                                      |
| Could    | Save favorite filter presets per user.                                                                        |

### 1.5 Collaboration and Notifications

| Priority   | Requirement                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Should     | In-app notifications (assignment, status change, approval); simple polling, no WebSocket.                                                                             |
| Should     | Invite collaborators to a project/organization — functional reinterpretation of the decorative "Share" button.                                                        |
| Could      | Comments and mentions within an incident.                                                                                                                             |
| Won't (v1) | Real-time chat, WhatsApp integration — an unused `whatsappOwner` placeholder field was dropped from the mock dataset in Phase 1 since this integration isn't pursued. |

### 1.6 Multi-tenancy / Organizations

| Priority | Requirement                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must     | Every user belongs to a real organization in the database; every endpoint filters by `orgId` (today "company" is just display text, any user sees the full dataset). |
| Must     | Roles gate real actions (create/edit/delete/approve), not just a label visible in the TopBar.                                                                        |
| Should   | Platform/superadmin role with cross-organization visibility.                                                                                                         |
| Could    | Organization member management (add/remove, role change).                                                                                                            |

### 1.7 Files and Media

| Priority | Requirement                                                         |
| -------- | ------------------------------------------------------------------- |
| Must     | Upload to S3 via presigned URLs (images, videos, documents).        |
| Must     | Replace current local blob URLs with persistent URLs.               |
| Should   | File size and type validation on the backend (not just the client). |
| Could    | Thumbnail generation for the gallery view.                          |

### 1.8 History / Audit

| Priority | Requirement                                                                    |
| -------- | ------------------------------------------------------------------------------ |
| Should   | Audit trail (who, what, when) for relevant changes to an incident.             |
| Should   | Real `/historial` page (today a sidebar link pointing to a nonexistent route). |
| Could    | History view filterable by project or user.                                    |

### 1.9 Internationalization (i18n)

| Priority   | Requirement                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must       | Functional TopBar language switcher (today decorative): switching to English re-renders **the entire** interface (map, dashboard, modals, validation messages, status/priority text) in English, not just navigation. Prioritized as Must because the project is an international portfolio piece — being able to show the demo in English is a real differentiator against other candidates. |
| Should     | Persist language preference per user (in the profile, not just browser `localStorage`).                                                                                                                                                                                                                                                                                                       |
| Won't (v1) | Languages beyond ES/EN.                                                                                                                                                                                                                                                                                                                                                                       |

### 1.10 Reporting and Export

| Priority   | Requirement                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Should     | Export filtered incidents as CSV.                                                                                                                                                                                                                                                                                                                                                                |
| Could      | Export a dashboard report as PDF.                                                                                                                                                                                                                                                                                                                                                                |
| Could      | Visual "Export and connect" option next to the CSV button: besides downloading the file, it exposes a stable data URL (an authenticated endpoint returning JSON/CSV) ready to paste into Power BI's "Web"/"From URL" connector or a Looker Studio file source — avoids building and certifying a custom connector for each tool, which would be disproportionate effort for the project's scope. |
| Won't (v1) | Scheduled reports sent by email.                                                                                                                                                                                                                                                                                                                                                                 |

### 1.11 Design and Interaction (motion)

Context: the visual interface (layout, palette, components) stays as-is — this block only adds intentional motion on top of what already exists, using the `motion` library (motion.dev, formerly Framer Motion). See `best-practices.md §Motion / Animations` for implementation detail.

| Priority   | Requirement                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Must       | Every animation respects `prefers-reduced-motion` — it's disabled or reduced to a minimal cross-fade if the user has it enabled at the system level.                     |
| Should     | Staggered entry of KPI cards and dashboard widgets on mount or when the period/filter changes.                                                                           |
| Should     | Hover micro-interaction (slight scale + shadow) on clickable cards: KPIs, the critical incidents table row, risk indicator chips, map markers.                           |
| Should     | Enter/exit transition on modals (`CreateIssueModal`, `IncidentDetailModal`, `DashboardFiltersModal`) — replaces the current instant show/hide with a short fade + scale. |
| Could      | Count-up/count-down animation on KPI numeric values when they change between periods.                                                                                    |
| Could      | Slide-in entry for in-app toasts/notifications (roadmap Phase 8).                                                                                                        |
| Won't (v1) | Scroll-driven animations or parallax effects — they don't serve the use case of a work tool, only a marketing landing page.                                              |

### 1.12 Responsive / Multi-device Design

Context: the interface already has partial responsive coverage, achieved so far through point fixes per iteration (dashboard horizontal overflow breaking Recharts sizing, rounded corners of the incident creation modal on mobile, project title hidden in header/footer, sidebar horizontal scroll). This section formalizes that coverage as an explicit requirement — with a focus on data tables, today solved only with contained horizontal scroll (`CriticalIssuesList.module.scss`, `.tableWrapper { overflow-x: auto; }`) — instead of leaving it as a series of reactive fixes with no prior definition of what "responsive" means for this product.

| Priority   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must       | No page (login, map, dashboard, modals) produces unintended horizontal scroll at any of the breakpoints already defined in `_variables.scss` (`$breakpoint-mobile: 480px`, `$breakpoint-tablet: 768px`, `$breakpoint-desktop: 1280px`, `$breakpoint-wide: 1600px`) — the `overflow-x: hidden` already applied at the `DashboardView` level is an emergency containment, not a substitute for a properly adapted per-component layout. |
| Must       | Every data table (today the dashboard's critical incidents table; the incident list, trash and history once they exist) defines an explicit mobile responsive strategy: contained horizontal scroll within the table as the acceptable minimum, with a transformation to stacked cards or breakpoint-prioritized columns as the preferred pattern before accepting horizontal scroll as the final solution.                           |
| Must       | Every modal (`CreateIssueModal`, `IncidentDetailModal`, `DashboardFiltersModal`) is fully usable on a mobile viewport: max height with internal content scroll (never the full document), touch controls with a minimum 44×44px hit area, no clipped edges or corners as the viewport changes.                                                                                                                                        |
| Should     | The four `_variables.scss` breakpoints are the single source of truth — no new component introduces ad-hoc media query values different from the ones already defined.                                                                                                                                                                                                                                                                |
| Should     | The map allows native touch gestures (pinch-zoom, pan) without the page scroll intercepting them on mobile.                                                                                                                                                                                                                                                                                                                           |
| Should     | An E2E regression suite (Playwright) that runs the critical flows (login, create incident, dashboard) also at a mobile viewport (e.g. `375×667`), in addition to the desktop viewport already covered — prevents a point responsive fix from breaking again without CI catching it.                                                                                                                                                   |
| Could      | A tablet-specific intermediate layout (between `$breakpoint-tablet` and `$breakpoint-desktop`) beyond the current binary mobile/desktop adaptation.                                                                                                                                                                                                                                                                                   |
| Won't (v1) | Native app or installable PWA — the goal is a responsive website, not an app-like experience with a service worker/manifest.                                                                                                                                                                                                                                                                                                          |

---

## 2. Non-functional requirements

| Category                      | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**               | Server-side pagination of incidents (today ~200 records are filtered and sorted 100% client-side); Core Web Vitals target LCP < 2.5s; Lambda cold starts documented as acceptable for a portfolio project (no constant traffic).                                                                                                                                                                                                                                                                                                                                                               |
| **Security**                  | Basic OWASP checklist on the API:<br>- Input validation (`class-validator`) and parameterized queries via Prisma.<br>- **Global rate limiting across the whole API** (not just login), with a stricter specific limit on `/auth/login` — necessary because the backend runs on AWS/Railway's free tier and unchecked scraping or abuse could exhaust Lambda invocation quota or Postgres connections, not just a brute-force concern on login.<br>- Security headers (`helmet`) and CORS restricted to the Vercel domain.<br>- Secrets never committed; refresh token in an `httpOnly` cookie. |
| **Availability**              | No formal SLA (non-commercial project); health-check endpoint; explicit handling of cold starts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Scalability**               | Stateless design; low `connection_limit` in Prisma given Lambda's concurrency pattern; S3 scales implicitly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Observability**             | Structured logging with `requestId` (CloudWatch); log retention explicitly configured to avoid cost accumulation; AWS billing alarm.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Accessibility**             | Maintain the level already reached (ARIA roles, `aria-live`, keyboard navigation) and extend it to every new page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **SEO**                       | Next.js Metadata API, `sitemap.xml`, `robots.txt`; explicit `noindex` on authenticated routes (the application is private behind login; SEO only applies to `/login` and an eventual landing page).                                                                                                                                                                                                                                                                                                                                                                                            |
| **Maintainability / Testing** | ≥70% domain coverage (already reached in the frontend) extended to the backend; every code change ships its test in the same iteration, never as a separate phase; Conventional Commits; SOLID principles applied both in NestJS (backend) and in the React hook/component structure (frontend).                                                                                                                                                                                                                                                                                               |

---

## 3. Technology stack

### 3.1 Already in place (kept as-is)

Next.js 14 (App Router) · TypeScript strict · Zustand 5 · SCSS Modules (BEM) · React Hook Form + Zod · Recharts 3 · native Mapbox GL JS · date-fns · Vitest 4 + Playwright · ESLint + Prettier + Husky · GitHub Actions · Vercel (frontend). See `docs/frontend-architecture.md` for how this is layered and structured today.

### 3.2 Proposed extension

| Layer                   | Technology                              | Rationale                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend framework       | **NestJS + TypeScript**                 | Native dependency injection and modularity — fits directly with the SOLID principles the project wants to demonstrate; same language as the frontend.                                                                                         |
| ORM                     | **Prisma**                              | Declarative migrations, end-to-end typing, good documentation for someone who hasn't worked with a TypeScript ORM before.                                                                                                                     |
| Database                | **PostgreSQL on Railway**               | An account the project owner already has; relational, fits naturally with the domain model already defined in TypeScript.                                                                                                                     |
| Auth                    | **Passport + JWT (custom)**             | Avoids adding Cognito to the AWS footprint; demonstrates a real auth implementation as a portfolio signal.                                                                                                                                    |
| Backend compute         | **AWS Lambda (Docker container image)** | Serverless with a practically perpetual free tier (1M requests/month, 400,000 GB-s of compute); scales to $0 cost with no traffic.                                                                                                            |
| Gateway                 | **Amazon API Gateway (HTTP API)**       | Free tier of 1M calls/month for the first 12 months; marginal cost after that (~$1/million).                                                                                                                                                  |
| Image registry          | **Amazon ECR**                          | Required by Lambda with `PackageType: Image`; 500MB/month free tier for 12 months.                                                                                                                                                            |
| File storage            | **Amazon S3**                           | Incident attachments (images, videos, documents), presigned URLs.                                                                                                                                                                             |
| IaC / deployment        | **AWS SAM**                             | `sam deploy --guided` is interactive and designed for someone who has never deployed to AWS; integrates well into GitHub Actions for later automated deploys.                                                                                 |
| Backend testing         | **Jest**                                | NestJS's idiomatic tool (CLI generators, `@nestjs/testing`) — each stack uses the tool that fits it, same reasoning the frontend already used to justify Vitest over Jest.                                                                    |
| Containerization        | **Docker** (multi-stage)                | Packages the backend as a Lambda-compatible image; also serves as a reproducible artifact for local development.                                                                                                                              |
| i18n                    | **next-intl**                           | Native integration with the App Router (server + client components), per-locale routing without rewriting the existing page structure.                                                                                                        |
| Animation (frontend)    | **motion** (motion.dev)                 | Successor to Framer Motion, framework-agnostic; natively supports `useReducedMotion()` (requirement 1.11 Must); integrates well with Next.js Server/Client Components, isolating interactivity in components that are already `'use client'`. |
| Rate limiting (backend) | **@nestjs/throttler**                   | Per-route configurable throttling, with different limits for the general API and for `/auth/login`.                                                                                                                                           |
| API documentation       | **@nestjs/swagger**                     | Generates interactive OpenAPI documentation from the same DTOs already validated with `class-validator` — see `best-practices.md §Code Documentation`.                                                                                        |

---

## 4. Target architecture

### 4.1 Data flow diagram

```
┌─────────────────────┐        HTTPS (JWT)        ┌──────────────────────────┐
│   Next.js frontend   │ ───────────────────────▶  │   API Gateway (HTTP API)  │
│   Vercel (Edge/SSR)   │ ◀───────────────────────  │                            │
└─────────┬────────────┘         JSON               └────────────┬──────────────┘
          │                                                       │
          │ presigned PUT (direct upload)                         ▼
          │                                          ┌──────────────────────────┐
          ▼                                          │  AWS Lambda (NestJS,       │
┌─────────────────────┐                              │  Docker image via ECR)    │
│      Amazon S3        │ ◀───────────────────────── │  Auth · Incidents ·        │
│  (attachments, plans)  │      presigned URLs          │  Organizations · Media    │
└─────────────────────┘                              └────────────┬──────────────┘
                                                                    │ Prisma (SSL,
                                                                    │ low connection_limit)
                                                                    ▼
                                                       ┌──────────────────────────┐
                                                       │  PostgreSQL on Railway    │
                                                       │  (outside AWS)            │
                                                       └──────────────────────────┘
```

### 4.2 Architecture principles

- **Dependency inversion already in place, kept as-is**: the frontend's `services/` layer is already designed as if it consumed a real API (async functions, error handling) — swapping its internal implementation for real HTTP calls shouldn't require touching components or stores.
- **Stateless backend**: every Lambda invocation is independent; state lives in Postgres (Railway) and S3, never in process memory.
- **Frontend and backend in separate domains** (Vercel vs. API Gateway): explicit CORS and `SameSite=None; Secure` cookies for the refresh token, documented step by step in `aws-deploy-guide.md` (a personal deployment guide, kept in Spanish — see that file's own header note).
- **Monorepo**: the frontend stays at the repository root without moving (so as not to break Vercel's already-working configuration); the backend lives in a new `backend/` folder with its own `package.json`, CI pipeline and deployment.
- **Single language**: TypeScript end-to-end (frontend, backend, scripts, IaC in YAML) reduces the cognitive load of maintaining the project solo.

### 4.3 Related documents

Entity and endpoint detail lives outside this document to avoid duplicating it: `docs/data-model.md` (fields and relationships for each entity) and `docs/api-contracts.md` (routes, request/response and errors per module). Both are the reference contract that the OpenAPI documentation `@nestjs/swagger` generates from the code is validated against (`best-practices.md §Code Documentation`) — if they diverge, the written contract wins until deliberately updated.

---

## 5. Acceptance Criteria (Must)

A short Given/When/Then for every **Must** requirement in section 1 — the minimum bar for a `roadmap.md` task to be considered closed. Should/Could items are validated against the general quality bar in `best-practices.md §Testing`, not a dedicated criterion per requirement.

**§1.1 Authentication and authorization**

- **Valid login** — Given a correct email and password for a user in the organization, when they submit the login form, then the API responds 200 with an access token and an `httpOnly` `refreshToken` cookie; with incorrect credentials it responds 401 without revealing whether the email exists.
- **JWT session** — Given an authenticated user, when their access token expires, then any protected request with that token responds 401 until the client renews it via `/auth/refresh`.
- **Logout revokes** — Given an authenticated user, when they call `/auth/logout`, then their refresh token is revoked in the database and a later `/auth/refresh` with the same cookie responds 401.
- **Middleware validates token** — Given a JWT with an invalid signature or expired, when it reaches a protected route, then `middleware.ts` redirects to `/login` even if the cookie exists.
- **RBAC per endpoint** — Given a user with the `member` role, when they call an endpoint that requires the `admin` role, then the API responds 403 without executing the action, regardless of what the UI allows to be shown.

**§1.2 Incident management**

- **Edit and close** — Given the creator or an assignee of an open incident, when they change its status to `closed`, then the API persists the change and the detail view reflects it without reloading the page.
- **Real owner and project** — Given an authenticated user creating an incident, when they submit it, then it's associated with their own session `userId` and the project chosen in the selector, never a fixed value in the code.
- **Full catalog** — Given the creation form, when the type selector is opened, then it lists all 15 type keys defined in the domain, not a subset.
- **Persistent attachment** — Given a file uploaded while creating an incident, when the page reloads or is opened on another device, then the file is still accessible (an S3 URL), not a local blob that expires.

**§1.3 Map**

- **Real map filter** — Given the "last N visits" slider moved to a value N, when the map re-renders, then it only shows markers within that window.

**§1.4 Dashboard / analytics**

- **Consistent company filter** — Given an active company filter, when both the KPIs and the critical incidents table are checked, then both show exclusively that company, never one filtered and the other not.
- **KPIs scoped by organization** — Given a user from Organization A, when they view the dashboard, then the KPIs exclude data from any other organization even if the user tampers with client-side filters.

**§1.6 Multi-tenancy / organizations**

- **orgId scoping** — Given a user from Organization A, when they call `GET /incidents`, then the API never returns rows with an `orgId` other than their own, regardless of the query params sent.
- **Roles gate actions** — Given a user without approval permission, when they call the approval endpoint, then they receive 403 even if they know the exact URL.

**§1.7 Files and media**

- **Presigned upload** — Given a valid file, when the client requests an upload URL, then it receives a single-use URL with a short expiration, and the file reaches S3 without its bytes passing through Lambda.
- **No blob URLs** — Given an already-uploaded attachment, when its URL is inspected in the incident detail view, then it's a persistent S3 URL, never `blob:`.

**§1.9 Internationalization**

- **Full language switch** — Given the language switcher set to English, when navigating to the map, the dashboard, or opening a modal, then all visible text —including validation messages and status/priority labels— appears in English, not just the navigation menu.

**§1.11 Motion / animations**

- **Respects reduced motion** — Given an OS with "reduce motion" enabled, when the dashboard mounts or a modal opens, then there's no perceptible enter/exit animation beyond a minimal cross-fade.

**§1.12 Responsive design**

- **No horizontal overflow** — Given a 375px-wide viewport, when navigating to any page, then no unintended horizontal scroll appears.
- **Responsive table** — Given a mobile viewport, when the critical incidents table is opened, then its content is legible without zooming, with horizontal scroll contained within the table as a minimum.
- **Mobile-usable modal** — Given a modal open on a mobile viewport, when its content exceeds screen height, then scrolling happens inside the modal, never on the full document, and no edge is clipped.
