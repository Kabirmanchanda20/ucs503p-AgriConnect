# AgriConnect — Backend developer guide

Audience: anyone extending the Express API. Prisma is the only data layer. The frontend depends on the JSON contract, not on file paths or table names.

Related: [API_CONTRACT.md](./API_CONTRACT.md) · [API_STATUS_CODES.md](./API_STATUS_CODES.md) · [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 1. Run the API

```bash
cd backend
copy .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Listens on **PORT** (default `5001`). Optional local Postgres: `docker compose up -d postgres` and the URL in `.env.example`.

| Script | What it does |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` / `npm start` | Compile + `node dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run prisma:migrate` | Dev migrations |
| `npm run prisma:seed` | Admin user from `ADMIN_SEED_*` |

Postman: `backend/postman/collection.json` + `environment.json`.

---

## 2. Folder map

```
backend/src/
├── server.ts                 # Prisma connect, listen
├── app.ts                    # Helmet, CORS, JSON 10kb, rate limits, mounts
├── routes/v1.ts              # /api/v1 router
├── config/                   # env (Zod), db, logger, cookies
├── common/                   # AppError, sendSuccess/sendError, decimals
├── middleware/
│   ├── require-auth.ts       # Bearer JWT → req.user
│   ├── optional-auth.ts      # listings browse
│   ├── require-active-account.ts  # 403 ACCOUNT_SUSPENDED
│   ├── role-guard.ts         # 403 FORBIDDEN
│   ├── validate.ts           # Zod → 400 VALIDATION_ERROR
│   ├── error-handler.ts      # envelope + Prisma mapping
│   └── not-found.ts
├── modules/<resource>/
│   ├── *.routes.ts
│   ├── *.controller.ts
│   ├── *.service.ts
│   └── *.schema.ts           # Zod
├── services/                 # email, storage, notifications
└── utils/                    # jwt, tokens
```

Mounts in `routes/v1.ts`: `auth`, `users`, `listings`, `orders`, `notifications`, `reports`, `admin`.

---

## 3. Request pipeline

Typical protected mutation:

`requireAuth` → `roleGuard('FARMER')` → `requireActiveAccount` → `validate({ body, params, query })` → controller → service → `sendSuccess`.

| Layer | Failure |
|---|---|
| `requireAuth` | 401 `UNAUTHORIZED` / `TOKEN_EXPIRED` / `TOKEN_INVALID` |
| `roleGuard` | 403 `FORBIDDEN` |
| `requireActiveAccount` | 403 `ACCOUNT_SUSPENDED` |
| `validate` | 400 `VALIDATION_ERROR` + `fields` |
| Service `AppError` | whatever you threw |
| Prisma `P2002` | 409 `CONFLICT` |
| Prisma `P2025` | 404 `NOT_FOUND` |
| Unknown | 500 `INTERNAL_ERROR` |
| No route | 404 `NOT_FOUND` |

Always throw `AppError`. Do not `response.status(400).json(...)` in a service.

```ts
throw new AppError(400, 'INVALID_REQUEST', 'Order status transition is not allowed');
```

Success:

```ts
sendSuccess(response, body);       // 200
sendSuccess(response, body, 201);  // create
sendPaginated(response, rows, pagination);
```

---

## 4. Auth and cookies

- Access JWT: ~15 minutes, `Authorization: Bearer`.
- Refresh: opaque token in HttpOnly cookie, `Path=/api/v1/auth`, 7 days, rotation + reuse detection.
- CORS: `CORS_ORIGINS` must include `http://localhost:3000` with `credentials: true`.
- Rate limits (`app.ts`): 100 req/min on `/api`; 10 **failed** req/min on `/api/v1/auth`.

Suspended users can refresh and read `/auth/me`. They cannot hit routes with `requireActiveAccount`.

---

## 5. Domain rules you must not break

### Listings

State file: `modules/listings/listing-status.ts`.

- `POST /listings` **always** inserts `draft`. `status: "active"` on create → 400 (no photos).
- Farmer transitions: `draft→active`, `active→draft`, `sold_out→active`, `expired→active`. `removed` is terminal for farmers.
- Activate requires ≥1 photo, quantity > 0, MOQ ≤ quantity.
- Deleting the last photo of an **active** listing forces `draft`.
- Public `GET /listings` is `active` only. Non-admin `status` filter → 400.
- Soft delete: `DELETE` sets `removed` + `deletedAt`.

### Orders

State file: `modules/orders/order-state-machine.ts`.

```
pending   → accepted | cancelled
accepted  → confirmed | cancelled
confirmed → fulfilled | cancelled
fulfilled / cancelled → (terminal)
```

| Actor | Approve | Change | Discard |
|---|---|---|---|
| Farmer owner | pending→accepted | accepted→confirmed, confirmed→fulfilled | cancel from pending/accepted/confirmed |
| Buyer owner | — | — | pending→cancelled only |
| Admin | — | — | cancel only |

Cancel **requires** `cancellationReason`. Cancel restores listing stock (`inventory.ts`). Create order uses an interactive transaction to avoid oversell → **409 `CONFLICT`**.

Wrong actor for a valid-looking transition → **400 `INVALID_REQUEST`**, not 403. Wrong owner of the row → **404**.

### Admin

- Cannot suspend self or another admin.
- Moderate listing: body `status` is only `removed` | `active`.
- Every mutation writes `AdminActivityLog`.

---

## 6. Adding or changing an endpoint

Do these in one change. The Cursor rule `.cursor/rules/update-api-docs.mdc` will remind you.

1. **Schema** — Zod in `*.schema.ts` (`.strict()` so extra keys 400).
2. **Route** — auth, role, active-account, `validate`, HTTP method/path.
3. **Service** — business rules as `AppError` with the **existing** `error.code` list (see status-code doc). Prefer 404 over 403 for IDOR.
4. **Tests** — Vitest next to the module (`*.test.ts`) for state machines and validation.
5. **Docs (required)**  
   - [API_CONTRACT.md](./API_CONTRACT.md) — path, body, success example  
   - [API_STATUS_CODES.md](./API_STATUS_CODES.md) — every HTTP code and approve/discard/change row  
   - [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) if a screen must change  
   - [CHANGELOG.md](./CHANGELOG.md) — breaking vs compatible  
6. **Frontend client** — `frontend/src/lib/api/` wrappers + `types.ts` if the JSON shape changed.
7. **Postman** — `backend/postman/collection.json` for the new request.

### Status-code policy

| Situation | HTTP | Code |
|---|---|---|
| Bad input shape | 400 | `VALIDATION_ERROR` |
| Illegal lifecycle (approve/discard/change) | 400 | `INVALID_REQUEST` |
| Not logged in | 401 | `UNAUTHORIZED` |
| Expired access JWT | 401 | `TOKEN_EXPIRED` |
| Wrong role | 403 | `FORBIDDEN` |
| Suspended mutating | 403 | `ACCOUNT_SUSPENDED` |
| Missing or not owned | 404 | `NOT_FOUND` |
| Duplicate / oversell | 409 | `CONFLICT` |
| Photo too big / bad MIME | 413 / 415 | `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` |
| Limiter | 429 | `RATE_LIMIT_EXCEEDED` |

Do not add a new `error.code` unless you document it in the master catalog.

---

## 7. Money, ids, dates

- UUIDs everywhere.
- Prices `NUMERIC(12,2)` → JSON **strings**. Quantities `NUMERIC(12,3)` → JSON **strings**. Helpers: `common/decimal.ts`.
- `priceTotal` is computed server-side (`round(qty * pricePerUnit, 2)`). Never trust a client total.
- Timestamps ISO-8601 UTC. `harvestDate` is `YYYY-MM-DD`.

---

## 8. What not to build in V1

- Socket.io, payments, reviews, messaging, ML.
- `GET /api/v1/admin/reports.csv`.
- Frontend-facing Supabase keys.
- Returning 200 with an error body.

---

## 9. Quick verification before you push

```bash
cd backend
npm run typecheck
npm run lint
npm test
```

Hit `/health` and `/ready`. Walk one approve and one discard on `PATCH /orders/:id/status` (farmer accept, buyer cancel) and confirm the codes in [API_STATUS_CODES.md](./API_STATUS_CODES.md) §4.1 still match `order-state-machine.ts`.
