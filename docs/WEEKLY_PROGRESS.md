# AgriConnect — weekly progress

Monday → Monday (IST). **Newest week on top.** On Monday close, move the finished week to **Archive** and open the next week number.

| | |
|---|---|
| **Team** | Kabir Manchanda, Manbhav Kumar Terry |
| **Course** | UCS503P |
| **Current week** | **Week 2** — Mon 31 Aug → Mon 7 Sep 2026 |
| **Updated** | Wed 2 Sep 2026 |
| **Status** | **Amber** — Mandi prices production-hardened: cache, circuit breaker, full crop list, stale fallback |

## Project phase snapshot

_Phased growth model (PRD §5): **Lab → Prototype → Capstone** — not release version numbers._

| Phase | Theme | Status | Notes |
|---|---|---|---|
| **Lab** | Functional CRUD marketplace | Complete (Week 1) | Auth/RBAC, listings, orders, admin, notifications, reports — see Archive |
| **Prototype** | Real-time, production-shaped system | In progress (Week 2) | Chat, market data, logistics, payment stub, alerts, Docker, CI — mostly in repo, uncommitted |
| **Capstone** | AI-assisted advisory platform | Not started | CV/NLP advisory, ML price prediction, optional IoT/traceability |

## Board — week 2

**Focus:** close **Prototype** milestone — integrate, test, commit, push for faculty review.

| | Task | Notes |
|---|---|---|
| **Working on** | Commit + push Prototype slice | Uncommitted: migration, market, logistics, payments, alerts, Docker, timeline, mandi badges |
| **Working on** | Live mandi feed (Agmarknet) | `latestOnly` on live table; grain probes for Wheat/Rice; history chart uses 90-day API |
| **Working on** | Docker + CI verification | Compose + Dockerfiles in repo; run `docker compose up` before demo |
| **Blocked** | — | None |
| **Done** | Real-time order chat + typing | Socket.io + REST — commit `c603f78` |
| **Done** | Reviews + Kisan assistant + CI | Commits `c603f78`, `9477dc0`, `0736886` |
| **Done** | Market price trends + summary | `GET /market/prices`, `/prices/summary`, `/market-prices` — in repo |
| **Done** | Logistics tracking | `PATCH /orders/:id/logistics`; farmer UI on order detail — in repo |
| **Done** | Escrow-style payment stub | Mock hold/confirm without live Razorpay — in repo |
| **Done** | Buyer produce alerts | `/buyer/alerts` + notification on new listings — in repo |
| **Done** | Listing lifecycle jobs | Expiry warnings + auto-expire — in repo |
| **Done** | Demo seed + schema migration | Faculty demo data + V2 DB migration — in repo |
| **Done** | Guest browse + landing UX | Logo hero, listing photos, public marketplace — in repo |
| **Done** | Order timeline + mandi compare badge | `OrderTimeline` on order detail; `POST /market/prices/compare` + marketplace badges — in repo |
| **Done** | Verification | Vitest 38/38; integration CRUD; frontend build; API smoke — in repo |
| **Backlog** | Capstone — ML advisory | Price prediction, crop CV, evaluation metrics |
| **Backlog** | Production Razorpay + webhooks | After Prototype demo |

**Risks:** Prototype work not on remote; faculty cannot review from GitHub until push; mandi 502 without API key.

**Next (Mon 7 Sep — Week 3):** commit/push Prototype; faculty demo; mandi env if key available; plan Capstone scope.

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
