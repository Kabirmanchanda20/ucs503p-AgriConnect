# AgriConnect — Changelog

Keep this file in reverse chronological order. Flag **breaking** changes so frontend and backend teammates can migrate.

Format: `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`.

---

## Unreleased

### Added

- **Hindi / Punjabi i18n** — English, Hindi (हिन्दी), and Punjabi (ਪੰਜਾਬੀ) UI via header language switcher; persists in `localStorage` and syncs to `languagePref` when signed in. Register/`PATCH /users/me` accept only `en`|`hi`|`pa`. Kisan assistant accepts optional `language` (`en`|`hi`|`pa`) and replies in that language.
- **Order timeline** — visual stepper on order detail for order status, escrow payment, and delivery logistics.
- **Mandi compare badge** — `POST /api/v1/market/prices/compare`; marketplace listing cards show Below/Above/Matches mandi vs Agmarknet reference.
- **Mandi prices resilience** — unsupported states (e.g. Haryana) and rate-limited live feed fall back to seeded Agmarknet reference data; expanded demo mandi seed across Punjab/Haryana/API states.

### Removed

- **3D harvest hero** — dropped the WebGL farm scene and Three.js packages. Landing is the original logo banner again.

### Fixed

- **Listing photos** — demo onion/tomato Unsplash URLs were 404; cards now fall back to local crop photos and skip the redundant Active badge.
- **Landing discoverability** — marketplace-focused home; live mandi rates live on `/market-prices` only (header link). Audit test listings hidden from public browse.

### Added (V2)

- **Market prices** — `GET /api/v1/market/prices` and `/prices/summary`; `PriceTrend` model; seeded Agmarknet-style reference data; frontend `/market-prices`.
- **Live govt mandi feed** — `GET /api/v1/market/mandi/prices`, `/mandi/history`, `/mandi/states`, `/mandi/markets`; Punjab/Haryana/Maharashtra sync from Agmarknet via data.gov.in (open mandi API); daily sync into `price_trends`.
- **Demo seed data** — `npm run prisma:seed` creates Punjab farmers/buyers, listings, orders (all statuses), chat messages, payments, reviews, alerts, and price trends for faculty demos.
- **Buyer produce alerts** — `BuyerCropAlert` CRUD (`GET/POST/DELETE /api/v1/alerts`); buyers notified on `LISTING_PUBLISHED` when farmers publish matching listings.
- **Listing jobs** — hourly expiry warnings (`LISTING_EXPIRING`) and auto-expire due listings.
- **Logistics tracking** — `logisticsStatus` on orders (`none` → `dispatched` → `in_transit` → `delivered`); `PATCH /api/v1/orders/:id/logistics`; farmer UI on order detail.
- **Escrow-style payments** — `Payment` model; `POST /orders/:id/payment` + `/payment/confirm`; optional Razorpay sandbox; mock mode without keys; release on `fulfilled`.
- **Chat typing** — Socket.io `typing:start` / `typing` events.
- **Docker** — `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` (postgres + api + web).
- **Price recording** — internal listing publish and order fulfill write `PriceTrend` rows.

### Fixed

- **Kisan chat history** — assistant replies longer than 4000 chars no longer break follow-up questions; frontend clips history to 2000 chars per turn when sending.
- **Nav active state** — Dashboard no longer highlights together with My listings on `/farmer/listings`.
- **Suspended login** — `POST /login` returns **403 `ACCOUNT_SUSPENDED`** instead of issuing tokens for suspended accounts (refresh + `/me` still work for already-signed-in users).
- **Order quantity validation** — Zod rejects `quantity: "0"` at the API boundary (was only rejected in service).
- **Login password** — empty password rejected by validation (`min(1)`).
- **Listing edit** — saving an active listing no longer forces `draft` unless the farmer unpublishes.
- **Register deep link** — `/register?role=BUYER` pre-selects buyer.
- **Buyer dashboard** — pending-order count filters `status=pending` (was total orders).
- **API error fields** — frontend `getErrorMessage` includes Zod `fields` in form errors.
- **Silent spinners** — orders, notifications, farmer listings, and admin pages show errors instead of infinite loading.
- **Notification badge** — header count refreshes immediately after mark-read on the alerts page.
- **Order reviews UI** — counterparty average rating shown on fulfilled orders.
- **Assistant** — suspended users blocked from `POST /assistant/query` (`requireActiveAccount`).

### Added

- **CI** — GitHub Actions workflow runs backend typecheck/lint/test and frontend lint on push/PR.
- **Integration check** — `npx tsx scripts/integration-crud-check.ts` verifies API writes land in Supabase.
- Schema tests for login password and order quantity validation.
- Supabase MCP configured in `.cursor/mcp.json` for live schema checks and migrations from Cursor.

### Security

- Enabled RLS on all `public` tables and revoked `anon` / `authenticated` grants (via Supabase MCP). Express/Prisma still uses the `postgres` connection; browser cannot query tables with the anon key.

### Added (features)

- **Real-time order chat** — `Message` model, REST (`GET/POST /api/v1/orders/:id/messages`, `POST .../read`), Socket.io (`join:order`, `message:new`), order detail chat UI.
- **Reviews & ratings** — `Review` model; buyer ↔ farmer ratings after `fulfilled`; `ratingAvg` updated on profiles; star display on listings and order page.
- **Kisan assistant status** — `GET /api/v1/assistant/status` and Online/Offline indicator in the chat widget.

### Fixed

- Applied `messages` and `reviews` migration to Supabase when direct `DIRECT_URL` (5432) is unreachable; added `npm run prisma:deploy:pooler` fallback script.
- Farmer and buyer dashboards no longer spin forever when the browser reuses cached API responses (`304 Not Modified`). API client now uses `cache: 'no-store'`; API success responses send `Cache-Control: no-store` and Express ETag is disabled.

### Added

- Developer documentation set: `docs/README.md`, `docs/API_STATUS_CODES.md`, `docs/FRONTEND_GUIDE.md`, `docs/BACKEND_GUIDE.md`, and this changelog.
- Cursor rule `.cursor/rules/update-api-docs.mdc` to keep API docs in sync with route and client changes.

---

## V1 (current implementation)

Shipped REST API under `/api/v1` covering auth, users, listings, orders, notifications, reports, and admin. See [API_CONTRACT.md](./API_CONTRACT.md) and [API_STATUS_CODES.md](./API_STATUS_CODES.md).
