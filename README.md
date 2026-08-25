# AgriConnect

**Direct market access for farmers. Direct sourcing for buyers.**

AgriConnect is a farmer-to-buyer agricultural marketplace. Farmers list produce with photos, price, and quantity. Buyers discover listings and place orders. Admins moderate users and listings. There is no middleman in the V1 product: price and stock live on the platform, and order progress is a visible state machine (pending → accepted → confirmed → fulfilled, or cancelled).

> **One-line pitch:** Direct market access and price transparency for farmers, with a production-shaped CRUD foundation that can grow into real-time logistics (V2) and AI crop advisory (V3).

This repository is a **monorepo**: a Next.js web app and an Express REST API. The browser talks **only** to Express. Express talks to **Supabase PostgreSQL** (via Prisma) and **Supabase Storage** (listing photos). The frontend never receives database URLs, JWT secrets, or the Supabase service-role key.

| | Local URL |
|---|---|
| Web app | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:5001](http://localhost:5001) |
| Health | [http://localhost:5001/health](http://localhost:5001/health) |
| Readiness (DB) | [http://localhost:5001/ready](http://localhost:5001/ready) |
| API prefix | `/api/v1` |

**New to the codebase?** After this README, open [docs/README.md](./docs/README.md).

---

## Why it exists

Farmers often lack a direct channel to buyers; buyers lack a reliable way to source from growers. Value leaks to opaque intermediary chains. AgriConnect V1 is the lab-ready marketplace that demonstrates:

- Full-stack CRUD with real auth and roles
- Listings, photo uploads, and inventory-safe orders
- Admin moderation and basic reports
- A contract that frontend and backend can share without sharing the database

What V1 is **not**: a payment processor, e-NAM replacement, logistics fleet, chat app, or ML service. Those are later phases (see [Roadmap](#roadmap-v1--v2--v3)).

---

## Who uses it

| Role | What they do in V1 |
|---|---|
| **Farmer** | Register, create draft listings, upload photos, publish, accept/confirm/fulfill incoming orders, cancel with a reason, view reports |
| **Buyer** | Register (trader / retailer / bulk / HORECA), browse the marketplace, place orders, cancel while the order is still `pending`, view spend reports |
| **Admin** | Seeded account (not self-register). Verify users, suspend/unsuspend, remove or reinstate listings, cancel orders, view analytics and activity logs |
| Public | Browse **active** listings and farmer public profiles (no email/phone) |

---

## How the system works

```
Browser  →  Next.js (UI)  →  Express REST API  →  Prisma  →  Supabase PostgreSQL
                              ↓
                         Supabase Storage (photos)
                              ↓
                         SMTP / console (password-reset email)
```

1. User logs in. The API returns a short-lived **access JWT** in JSON. A **refresh token** is set as an HttpOnly cookie (`Path=/api/v1/auth`).
2. The UI keeps the access token **in memory** (not `localStorage`). Axios/fetch sends `Authorization: Bearer` plus cookies (`credentials: 'include'`).
3. When the access token expires (~15 minutes), the client calls `POST /api/v1/auth/refresh`, then retries.
4. Farmers create listings as **draft**, upload 1–5 photos (JPEG/PNG/WebP, ≤5 MB), then **PATCH** status to `active`.
5. Buyers place orders against **active** listings. Quantity is decremented in a database transaction so two buyers cannot oversell.
6. The farmer **approves** (`accepted`), **changes** (`confirmed` → `fulfilled`), or **discards** (`cancelled` + reason). Buyers may discard only from `pending`. Admins may only cancel.
7. In-app notifications fire on order and moderation events. The UI polls; Socket.io is reserved for V2.

**Hard rules**

- Frontend never queries Supabase tables or uses the service-role key.
- Money and quantities are PostgreSQL `NUMERIC`, serialized as **JSON strings** (`"25.00"`, `"500.000"`). Currency is INR.
- IDs are UUIDs. Dates are ISO-8601 UTC; `harvestDate` is `YYYY-MM-DD`.
- Errors use HTTP status codes plus `{ success: false, error: { code, message, fields? } }`. Success is `{ success: true, data }` (lists also include `pagination`).

---

## Tech stack

Names only — install current patched releases; do not copy old version pins from docs.

| Layer | Choice | Role |
|---|---|---|
| Runtime | Node.js **24+** (`engines` in backend) | Both apps |
| Language | TypeScript (strict on the API) | Shared |
| Web UI | **Next.js** (App Router) + React + **Tailwind CSS** | `frontend/` |
| HTTP client | `fetch` wrapper in `frontend/src/lib/api` | Bearer + cookie refresh |
| API | **Express 5** | `backend/` |
| Validation | **Zod** | Env vars + every body/query/params |
| ORM | **Prisma** | `backend/prisma/` |
| Database | **PostgreSQL** on **Supabase** | App data |
| Files | **Supabase Storage** bucket `listings` | Photos; service role on the server |
| Auth | **jsonwebtoken** + bcryptjs | Access JWT + hashed refresh tokens |
| Email | **Nodemailer** | Password reset; console fallback if SMTP unset |
| Security | helmet, cors allowlist, express-rate-limit | Headers, cookies, 100 req/min API, 10 failed auth/min |
| Logging | pino | Structured logs |
| Tests | Vitest + Supertest | `backend` |
| Local DB option | Docker Compose `postgres:16` | When not using cloud Postgres |
| API exploration | Postman collection | `backend/postman/` |

Not in V1: MongoDB, Mongoose, Vite, Passport/Google OAuth, Socket.io, FastAPI/ML.

---

## What is already built (V1)

| Area | Capability |
|---|---|
| Auth | Register (farmer/buyer), login, refresh, logout, `/me`, forgot/reset password, lockout after 5 failed logins |
| Profiles | Farmer/buyer profiles, DPDP-style data export, soft-delete account |
| Listings | Draft → photos → active; search/filter; view counts; expire/sold-out; farmer unpublish or delete |
| Orders | Place order, inventory decrement, status machine, stock restore on cancel |
| Notifications | List, mark one read, mark all read |
| Reports | Farmer: listings / qty sold / revenue (fulfilled). Buyer: orders / spend (fulfilled) |
| Admin | Users (search, suspend, verify), listing moderate (remove/reinstate), analytics, activity logs |

**Listing statuses:** `draft` → `active` ⇄ `draft`; `sold_out` / `expired` → `active`; `removed` is terminal for farmers (admin can reinstate).

**Order statuses:** `pending` → `accepted` → `confirmed` → `fulfilled`, or `cancelled` from the first three. Full HTTP codes and illegal transitions: [docs/API_STATUS_CODES.md](./docs/API_STATUS_CODES.md).

**Not implemented (do not call):** `GET /api/v1/admin/reports.csv`.

---

## Repository layout

```
Project AgriConnect/
├── frontend/                 # Next.js UI (port 3000)
│   └── src/
│       ├── app/              # Pages: marketplace, farmer, buyer, orders, admin
│       ├── features/auth/    # Session, RequireAuth, GuestOnly
│       └── lib/api/          # Typed client — keep in sync with the contract
├── backend/                  # Express API (port 5001)
│   ├── src/
│   │   ├── app.ts            # Middleware, rate limits, /health, /ready
│   │   ├── routes/v1.ts      # Mounts /api/v1/*
│   │   ├── modules/          # auth, users, listings, orders, notifications, reports, admin
│   │   ├── middleware/       # JWT, roles, Zod, errors
│   │   └── services/         # email, storage, notifications
│   ├── prisma/               # schema, migrations, seed
│   └── postman/
├── docs/                     # Contracts, architecture, guides
├── docker-compose.yml        # Optional local PostgreSQL
├── instruction.md            # Engineering blueprint (practices, not this product)
└── README.md                 # This file
```

Each backend module is `routes` → thin `controller` → `service` (Prisma + rules) → Zod `schema`.

---

## Prerequisites

- **Node.js 24** or newer and npm
- Git
- A **Supabase** project (PostgreSQL + Storage bucket `listings`), **or** Docker for local Postgres (`docker compose up -d postgres`)
- Windows: use `copy`; macOS/Linux: use `cp`

Do not commit `.env` or `.env.local`.

---

## Quick start

### 1. Backend

```bash
cd backend
copy .env.example .env
```

Fill `backend/.env`: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`, JWT secrets, `ENCRYPTION_KEY`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`. See [docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md).

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

API: `http://localhost:5001`. Seeded admin is `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.

Optional local database:

```bash
docker compose up -d postgres
```

Use the connection URL from `backend/.env.example` for that container.

### 2. Frontend

```bash
cd frontend
copy .env.example .env.local
```

`NEXT_PUBLIC_API_BASE_URL=http://localhost:5001` (no trailing slash).

```bash
npm install
npm run dev
```

UI: `http://localhost:3000`. Register a farmer or buyer, or log in as the seeded admin.

### 3. Verify

```bash
cd backend
npm run typecheck
npm run lint
npm test
npm audit --audit-level=high
```

Frontend: `npm run lint`. Confirm `/health` returns `{ "success": true, "data": { "status": "ok" } }`.

---

## API at a glance

| Method | Path | Who |
|---|---|---|
| GET | `/health`, `/ready` | Public |
| POST | `/api/v1/auth/register`, `/login`, `/refresh`, `/logout` | Public / cookie |
| GET | `/api/v1/auth/me` | Any logged-in user |
| GET/POST/PATCH/DELETE | `/api/v1/listings` | Public browse; farmer writes |
| POST/GET/PATCH | `/api/v1/orders`, `/orders/:id/status` | Buyer create; farmer/admin status |
| GET/PATCH/POST | `/api/v1/notifications` | Logged-in |
| GET | `/api/v1/reports/me` | Farmer or buyer |
| GET/PATCH | `/api/v1/admin/*` | Admin only |

Auth header: `Authorization: Bearer <accessToken>`. Browser calls use cookies for refresh.

| HTTP | Meaning (typical) |
|---|---|
| 200 / 201 | Success / created |
| 400 | Validation or illegal approve / discard / change |
| 401 | Missing, expired, or invalid token; bad login |
| 403 | Wrong role, or account suspended on a write |
| 404 | Missing resource, or not yours (IDOR-safe) |
| 409 | Email taken or not enough listing quantity |
| 413 / 415 | Photo too large / wrong type |
| 429 | Rate limit |
| 503 | Database down (`/ready`) |

Full shapes: [docs/API_CONTRACT.md](./docs/API_CONTRACT.md). Every status and error: [docs/API_STATUS_CODES.md](./docs/API_STATUS_CODES.md). Postman: `backend/postman/collection.json`.

---

## Web app routes

| Path | Purpose |
|---|---|
| `/` | Landing |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth |
| `/marketplace`, `/listings/[id]` | Browse and listing detail |
| `/farmer`, `/farmer/listings`, `/farmer/listings/new` | Farmer home and listing CRUD |
| `/buyer` | Buyer home |
| `/orders`, `/orders/[id]` | Order list; accept / confirm / fulfill / cancel |
| `/notifications`, `/profile`, `/dashboard` | Inbox, profile, role redirect |
| `/admin`, `/admin/users`, `/admin/listings`, `/admin/logs` | Moderation and analytics |

---

## Documentation

| Document | Audience | Contents |
|---|---|---|
| [docs/README.md](./docs/README.md) | Anyone joining | Read order, known gaps, where to edit |
| [docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md) | Setup | Env vars, Supabase, CORS, cookies |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Technical | Boundaries, request flow, security |
| [docs/DATABASE_DESIGN.md](./docs/DATABASE_DESIGN.md) | Backend | ERD, enums, inventory rules |
| [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) | Both | Request/response JSON |
| [docs/API_STATUS_CODES.md](./docs/API_STATUS_CODES.md) | Both | Status codes, approve/discard/change |
| [docs/FRONTEND_GUIDE.md](./docs/FRONTEND_GUIDE.md) | Frontend | Client, guards, screens |
| [docs/BACKEND_GUIDE.md](./docs/BACKEND_GUIDE.md) | Backend | Modules, AppError, adding endpoints |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md) | Both | What changed |
| [docs/AgriConnect_PRD.md](./docs/AgriConnect_PRD.md) | Product | Goals, personas, later phases |
| [docs/PRD_AMENDMENTS.md](./docs/PRD_AMENDMENTS.md) | Engineering | Binding V1 stack/scope (wins over PRD on conflicts) |

Cursor agents: `.cursor/rules/update-api-docs.mdc` requires API docs to update whenever routes or `frontend/src/lib/api` change.

---

## Roadmap (V1 → V2 → V3)

| Phase | Theme | Not in this repo yet |
|---|---|---|
| **V1 — Lab (current)** | Auth, RBAC, listings, orders, admin, notifications, reports | — |
| **V2 — Prototype** | Chat, reviews, escrow-style payments, logistics tracking, Docker/CI, Socket.io | Do not add until scoped |
| **V3 — Capstone** | ML advisory (separate Python service), richer market intelligence | Separate `ml-service/` later |

---

## Security notes for reviewers

- Secrets stay in `backend/.env`. The only public frontend env is `NEXT_PUBLIC_API_BASE_URL`.
- Refresh tokens are hashed in the database, rotated on every refresh, and reuse of an old token revokes the user’s refresh family.
- Suspended users can still refresh and load `/me` (so the UI can show a blocked state) but cannot mutate listings, orders, or profiles.
- Rate limits apply to `/api` and more strictly to `/api/v1/auth`.
- Ownership checks return **404**, not 403, so listings/orders of other users are not confirmed to exist.

---

## Scripts

**Backend** (`cd backend`)

| Script | Purpose |
|---|---|
| `npm run dev` | Watch server |
| `npm run build` / `npm start` | Production compile + run |
| `npm run typecheck` / `lint` / `test` | Quality gates |
| `npm run prisma:generate` / `migrate` / `seed` | Database |

**Frontend** (`cd frontend`)

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js on port 3000 |
| `npm run build` / `start` | Production |
| `npm run lint` | ESLint |
