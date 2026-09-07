# AgriConnect — weekly progress

Monday → Monday (IST). **Newest week on top.** On Monday close, move the finished week to **Archive** and open the next week number.

| | |
|---|---|
| **Team** | Kabir Manchanda, Manbhav Kumar Terry |
| **Course** | UCS503P |
| **Current week** | **Week 2** — Mon 31 Aug → Mon 7 Sep 2026 |
| **Updated** | Mon 7 Sep 2026 |
| **Status** | **Green** — Prototype demo-ready; mandi needs backend on :5001 (Haryana Potato/Onion live today) |

## Project phase snapshot

_Phased growth model (PRD §5): **Lab → Prototype → Capstone** — not release version numbers._

| Phase | Theme | Status | Notes |
|---|---|---|---|
| **Lab** | Functional CRUD marketplace | Complete (Week 1) | Auth/RBAC, listings, orders, admin, notifications, reports — see Archive |
| **Prototype** | Real-time, production-shaped system | Complete (Week 2) | Chat, mandi, logistics, payments, alerts, Docker/CI, i18n — on `backend_frontend` |
| **Capstone** | AI-assisted advisory platform | Not started | CV/NLP advisory, ML price prediction, optional IoT/traceability |

## Board — week 2

**Focus:** faculty demo from **`backend_frontend`**; then plan Capstone.

| | Task | Notes |
|---|---|---|
| **Done** | Commit + push Prototype slice | `49a11f1` (+ CI fixes `4bc4814`, `4e17381`); remote `origin/backend_frontend` |
| **Done** | Live mandi feed (Agmarknet) | `latestOnly`, grain probes, 90-day history — `49a11f1` / `mandi-prices.service.ts` |
| **Done** | Docker + CI | `docker-compose.yml`, Dockerfiles, `.github/workflows/ci.yml` — `49a11f1` |
| **Done** | Hindi / Punjabi i18n | en/hi/pa switcher; register + profile; Kisan language — `41455f0` |
| **Blocked** | — | None |
| **Done** | Real-time order chat + typing | Socket.io + REST — commit `c603f78` |
| **Done** | Reviews + Kisan assistant + CI | Commits `c603f78`, `9477dc0`, `0736886` |
| **Done** | Market price trends + summary | `GET /market/prices`, `/prices/summary`, `/market-prices` — `49a11f1` |
| **Done** | Logistics tracking | `PATCH /orders/:id/logistics` — `49a11f1` |
| **Done** | Escrow-style payment stub | Mock hold/confirm — `49a11f1` |
| **Done** | Buyer produce alerts | `/buyer/alerts` — `49a11f1` |
| **Done** | Listing lifecycle jobs | Expiry warnings + auto-expire — `49a11f1` |
| **Done** | Demo seed + schema migration | V2 migration + seed — `49a11f1` |
| **Done** | Guest browse + landing UX | Logo hero, public marketplace — `49a11f1` |
| **Done** | Order timeline + mandi compare badge | `OrderTimeline`; `POST /market/prices/compare` — `49a11f1` |
| **Done** | Verification | Backend Vitest 43/43; frontend build; i18n parity — local + `41455f0` |
| **Working on** | Faculty Prototype demo | Walkthrough from `backend_frontend`; Haryana Potato/Onion/Tomato have live rows today; Wheat may be empty |
| **Working on** | Marketplace / mandi load UX | Uncommitted: backend-down message; Haryana in state fallback; Promise.allSettled on mandi page; `filters[state]` fix |
| **Working on** | Register required fields | Uncommitted: phone, state, district required; village optional |
| **Working on** | 10 additional UI locales | Uncommitted: bn, ta, te, mr, gu, kn, ml, or, as, ur message patches — `frontend/src/lib/i18n/messages/` |
| **Done** | API endpoint catalog (boss review) | Uncommitted: `docs/API_ENDPOINTS.md` + contract gaps (meta, commodities, outbound) |
| **Backlog** | Capstone — ML advisory | Price prediction, crop CV, evaluation metrics |
| **Backlog** | Production Razorpay + webhooks | After Prototype demo |

**Risks:** Mandi page shows network error if backend (:5001) is down; Haryana only appears from API when `DATA_GOV_IN_API_KEY` is set (now also in UI fallback list). Some crop×state pairs are empty when Agmarknet has no arrivals that day.

**Next (Mon 7 Sep — Week 3):** faculty demo; merge/PR `backend_frontend` → `master` if needed; plan Capstone scope.

---

## Archive

### Week 1 — Mon 24 Aug → Mon 31 Aug 2026

| | |
|---|---|
| **Milestone** | **Lab** — functional CRUD marketplace |
| **Status** | **Green** — lab acceptance criteria met |
| **Closed** | Mon 31 Aug 2026 |

**Delivered:** Auth/RBAC (farmer, buyer, admin), listings + photos, order state machine (pending → accepted → confirmed → fulfilled / cancelled), admin moderate/verify/suspend, notifications, reports, password reset, public marketplace browse.

**Engineering:** Full-stack monorepo, Prisma + Supabase, Express REST API, Next.js App Router, Zod validation, JWT + refresh cookies, ownership checks, rate limits.

**Deferred to Prototype (Week 2):** Real-time chat, market intelligence, logistics, payments, alerts, containerization.

**Commits (remote):** through `1f65e2c` initial stack; Lab feature work on `backend_frontend` before 31 Aug.

---

_When Week 3 starts (Mon 7 Sep): archive Week 2 board here, then open Week 3 with fresh **Working on** rows._
