# FlyWorkFlow

Incident management for construction sites: report issues on a georeferenced map, move them through approval and resolution, and follow the project from a live dashboard. A full-stack portfolio project — Next.js on Vercel, NestJS on AWS Lambda, PostgreSQL on Railway — built one iteration at a time, with the reasoning for each written down in [`docs/roadmap.md`](docs/roadmap.md).

[![CI](https://github.com/hervid2/flyworkflowapp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hervid2/flyworkflowapp/actions/workflows/ci.yml)
[![Backend CI](https://github.com/hervid2/flyworkflowapp/actions/workflows/backend-ci.yml/badge.svg?branch=main)](https://github.com/hervid2/flyworkflowapp/actions/workflows/backend-ci.yml)
[![Backend Deploy](https://github.com/hervid2/flyworkflowapp/actions/workflows/backend-deploy.yml/badge.svg?branch=main)](https://github.com/hervid2/flyworkflowapp/actions/workflows/backend-deploy.yml)

## Live demo

|         |                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App** | [flyworkflowapp.vercel.app](https://flyworkflowapp.vercel.app)                                                                                        |
| **API** | `https://50s0hvq0me.execute-api.us-east-1.amazonaws.com` — health check at [`/health`](https://50s0hvq0me.execute-api.us-east-1.amazonaws.com/health) |

Sign in with one of the demo accounts. Every company, person and incident in the data is fictional.

| Account                                  | Role                                                    | Password           |
| ---------------------------------------- | ------------------------------------------------------- | ------------------ |
| `isabela.nieto@constructoradelvalle.com` | Admin — history, trash, approvals, invitations          | `FlyWorkFlow2026!` |
| `diego.salazar@constructoradelvalle.com` | Member — reports and works incidents within their scope | `FlyWorkFlow2026!` |

The demo is shared: anything you create stays visible to the next visitor until the data is reseeded. Ten wrong passwords lock an account for fifteen minutes, which is the brute-force protection working rather than an outage. The interface opens in Spanish; the language switch in the top bar turns it to English.

## Screenshots

| Map                                                              | Dashboard                                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ![Incident map with clustered markers](docs/screenshots/map.jpg) | ![Dashboard with KPIs, charts and risk indicators](docs/screenshots/dashboard.png) |
| **History**                                                      | **Documents**                                                                      |
| ![Audit log of incident changes](docs/screenshots/history.png)   | ![Documents attached to incidents](docs/screenshots/documents.png)                 |
| **Gallery**                                                      | **Calendar**                                                                       |
| ![Media gallery](docs/screenshots/gallery.jpg)                   | ![Calendar of incident activity](docs/screenshots/calendar.png)                    |

<p align="center">
  <img src="docs/screenshots/dashboard-mobile.png" alt="The dashboard on a phone" width="280">
</p>

## What it does

- **Map** — incidents on Mapbox GL with marker clustering, 2D/3D, date and recent-visit filters, and a create flow with location picker, tags, assignees, observers and attachments.
- **Dashboard** — KPIs, status and priority breakdowns, created-versus-closed trend, risk indicators that filter the critical-issues table, an activity heatmap, distribution by type and tag, and team performance. Exports to CSV, or as a tokenized data URL for Power BI and Looker Studio.
- **Workflow** — status transitions, admin approval and rejection, soft delete with a trash and restore, and in-app notifications for assignments, status changes and approvals.
- **History** — an audit log of every change to an incident, filterable by project and user.
- **Media** — attachments go straight from the browser to S3 through presigned URLs and come back through short-lived signed ones: a gallery for photos and video, a list for documents, and project plans as images or PDFs.
- **Organizations** — tenant-scoped data, member / admin / superadmin roles, invitation links for collaborators, and profile and password settings.
- **Throughout** — Spanish and English, layouts down to phone width, and animations that respect reduced motion.

## Architecture

![FlyWorkFlow production architecture](docs/architecture/flyworkflow-share-card.png)

<sub>Drawn with [Archify](https://github.com/tt-a1i/archify) from [`docs/architecture/flyworkflow.architecture.json`](docs/architecture/flyworkflow.architecture.json) — the diagram is source, not a picture someone redraws. There is an [interactive version](https://hervid2.github.io/flyworkflowapp/architecture/flyworkflow.html) too, with guided views, where each node links to the file it stands for.</sub>

- **Two deploy paths from one repository.** Vercel's Git integration builds the frontend on every push to `main`. `backend-deploy.yml` applies Prisma migrations, builds the Lambda image and runs `sam deploy` — migrations first, because they are additive and the running image keeps working against the new schema while the new one rolls out.
- **Uploads never pass through Lambda.** The API presigns a PUT with the file size inside the signature, the browser writes straight to S3, and the API then asks S3 what actually arrived and records that type and size rather than the ones the client declared. Reads go out as short-lived signed GETs, with documents signed as downloads.
- **Sessions** are a fifteen-minute JWT plus a rotating refresh token, stored hashed and sent in an `httpOnly` cookie. Presenting an already-rotated refresh token revokes every session for that user, and failed logins are counted per account in Postgres, where every Lambda instance sees the same number.
- **Observability** is one structured log line per request, carrying a correlation id, and three alarms — one per failure surface that the others cannot see: Lambda errors, API Gateway 5xx responses, and handled 500s from the application's own logs.

## Tech stack

| Layer          | Tools                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend       | Next.js 16 (App Router), React 19, TypeScript, Zustand 5, next-intl 4, Mapbox GL 3 with supercluster, Recharts 3, React Hook Form with Zod 4, Motion, SCSS modules |
| Backend        | NestJS 11, Prisma 6, PostgreSQL, Passport (local and JWT), bcrypt, helmet, @nestjs/throttler, AWS SDK v3                                                           |
| Infrastructure | AWS SAM — Lambda (container image), API Gateway HTTP API, S3, CloudWatch, SNS · Vercel · Railway                                                                   |
| Testing        | Vitest with Testing Library, Jest with Supertest, Playwright with axe-core                                                                                         |
| CI/CD          | GitHub Actions                                                                                                                                                     |

## Engineering notes

[`docs/roadmap.md`](docs/roadmap.md) records what shipped and why, including the approaches that did not work. Some entries worth reading:

- **The security passes (F9.4–F9.5)** — an upload URL taken on the client's word that allowed both stored XSS and deletes across tenants, CSV formula injection, refresh-token reuse detection, a per-account lockout, and a per-request nonce Content-Security-Policy.
- **Accessibility (F9.7 onwards)** — an axe audit that passed 12 of 12 while rendering nothing but empty states, and contrast fixed for each foreground-and-background pair rather than for each colour.
- **Getting to production** — seven fixes between the first failed deploy and the first upload verified end to end, most of them hidden behind the one before.

## Running it locally

You need Node.js 22, Docker (for PostgreSQL) and a free [Mapbox access token](https://account.mapbox.com).

```bash
git clone https://github.com/hervid2/flyworkflowapp.git
cd flyworkflowapp
npm install
npm --prefix backend install

# PostgreSQL 16 on localhost:5433, same image and credentials as CI
npm run e2e:db:up
```

Backend, on `http://localhost:3001`:

```bash
cd backend
cp .env.example .env
# In .env, set:
#   DATABASE_URL="postgresql://flyworkflow:flyworkflow@localhost:5433/flyworkflow?schema=public"
#   JWT_ACCESS_SECRET to any long random string
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

Frontend, on `http://localhost:3000`, from the repository root in a second terminal:

```bash
cp .env.example .env.local
# In .env.local, set NEXT_PUBLIC_MAPBOX_TOKEN, and JWT_ACCESS_SECRET to the backend's value
npm run dev
```

Everything except uploads works without AWS; attachments need a real S3 bucket (see [`docs/aws-deploy-guide.md`](docs/aws-deploy-guide.md)).

## Tests

| Command                             | What runs                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                          | Vitest unit and component tests for the frontend                                                                                                       |
| `npm --prefix backend test`         | Jest unit tests for the API                                                                                                                            |
| `npm --prefix backend run test:e2e` | API end-to-end tests through the full Nest pipeline, against an in-memory Prisma double                                                                |
| `npm run e2e:local`                 | Playwright against a real backend and a seeded PostgreSQL in Docker, on desktop and mobile — including a WCAG 2.1 AA audit and Core Web Vitals budgets |

## CI/CD

- **`ci.yml`** — lint, type-check, unit tests with coverage and a production build, then the Playwright suite against the real backend and an ephemeral `postgres:16`.
- **`backend-ci.yml`** — lint, type-check, tests and build for changes under `backend/`, plus `npm audit`.
- **`backend-deploy.yml`** — on pushes to `main` that touch `backend/`: `prisma migrate deploy`, then `sam build` and `sam deploy`.
- **Vercel** — the project's Git integration deploys `main`; there is no workflow for the frontend deploy.

## Repository layout

```text
├── src/          Next.js app — app/ routes, components/, domain/, services/, store/
├── backend/      NestJS API, Prisma schema and seed, SAM template, Dockerfile
├── e2e/          Playwright specs
├── __tests__/    Vitest tests
├── messages/     Spanish and English translations
├── public/mocks/ the demo dataset, and the PDFs the seed attaches
├── scripts/      demo-data generators and the local e2e runner
└── docs/         requirements, data model, API contracts, roadmap, AWS guide
```

## Documentation

| Document                                                  | Contents                                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [roadmap.md](docs/roadmap.md)                             | Every iteration, and the reasoning behind it                                                 |
| [requirements.md](docs/requirements.md)                   | Functional and non-functional requirements, prioritized — written before the backend existed |
| [data-model.md](docs/data-model.md)                       | Entities, relations and indexes                                                              |
| [api-contracts.md](docs/api-contracts.md)                 | REST endpoints                                                                               |
| [best-practices.md](docs/best-practices.md)               | Conventions, and the security decisions taken in writing                                     |
| [frontend-architecture.md](docs/frontend-architecture.md) | Frontend layering, as it stood before the real backend                                       |
| [aws-deploy-guide.md](docs/aws-deploy-guide.md)           | Step-by-step AWS setup (in Spanish)                                                          |
| [glossary.md](docs/glossary.md)                           | Domain terms                                                                                 |
