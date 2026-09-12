# AgriConnect — weekly progress

Monday → Monday (IST). **Newest week on top.** On Monday close, move the finished week to **Archive** and open the next week number.

| | |
|---|---|
| **Team** | Kabir Manchanda, Manbhav Kumar Terry |
| **Course** | UCS503P |
| **Current week** | **Week 3** — Mon 7 Sep → Mon 14 Sep 2026 |
| **Updated** | Sat 12 Sep 2026 |
| **Status** | **Green** — Interactive README polish (collapsibles + TOC + phase badges) |

## Project phase snapshot

_Phased growth model (PRD §5): **Lab → Prototype → Capstone** — not release version numbers._

| Phase | Theme | Status | Notes |
|---|---|---|---|
| **Lab** | Functional CRUD marketplace | Complete (Week 1) | Auth/RBAC, listings, orders, admin, notifications, reports — see Archive |
| **Prototype** | Real-time, production-shaped system | Complete (Week 2–3) | Chat, calls, mandi, logistics, escrow payments + webhook, 13-locale UI, contact guard — see board |
| **Capstone** | AI-assisted advisory platform | In progress | Grounded Kisan RAG + AGRONOMIST + profile weather (shipping) |

## Board — week 3

**Focus:** faculty demo from `master`; then Capstone scope.

| | Task | Notes |
|---|---|---|
| **Working on** | Faculty Prototype demo | Walkthrough from `master`; Haryana Potato/Onion/Tomato have live rows; Wheat may be empty |
| **Done** | Interactive README polish | Hero TOC, phase shields, centered demo, `<details>` for dense sections; Quick start stays open |
| **Done** | Root README refresh | Faculty-facing Lab→Prototype→Capstone snapshot; `code/AgriConnect` paths; accurate Capstone status |
| **Done** | UCS503 faculty docs + Week 1–3 decks | `docs/index.md`, requirements, architecture-overview, testing, evaluation, ROADMAP, progress PPTX |
| **Done** | Master layout like UCS503 template | App under `code/AgriConnect/`; `assets/`, stub `project-report-*`, `reports/`; `LICENSE` |
| **Done** | `project-proposal/` on `master` | AgriConnect PDF + LaTeX (BharatAssist-style headings; Submitted to Mr. Hardik) |
| **Done** | Grounded Kisan (RAG) Capstone §8.2 | Same widget; curated pack + cite/refuse; `AGRONOMIST` + escalations; profile weather + 5-day; `eval:grounded` 30/30 |
| **Done** | Commit + push Prototype slice | Local verify: 138 backend / 128 frontend tests; smoke antibypass + calls; push `backend_frontend` → merge `master` |
| **Done** | Payment methods + gateway escrow | UPI/card/netbanking/COD; Razorpay verify on confirm; signed webhook; buyer payment nudge; unpaid-fulfill warning |
| **Done** | Anti-bypass contact guard | Chat, order notes, listing description/variety/village → 400 `CONTACT_INFO_BLOCKED` |
| **Done** | In-app voice calls | WebRTC + Socket.io; 45s ring timeout; smoke:calls 13/13 |
| **Done** | 13-locale UI + frontend tests | 477 keys × 13; Vitest screens/parity/width budget; header/RTL/webfonts |
| **Done** | Faster Kisan talk | Pinned TTS model + minimal thinking; ~45-word replies; ~280-char speak clip |
| **Done** | Edge-case hardening | Body-parser 413 mapping; webhook match by checkout id; socket token refresh; COD switchable |
| **Done** | Natural orders list | Smoke junk cleaned; active statuses sort above cancelled |
| **Blocked** | — | None |
| **Backlog** | Native-speaker pass on the ten new dictionaries | Machine-translated today |
| **Backlog** | Capstone — ML price / crop CV | Still backlog after Grounded Kisan |
| **Backlog** | Farmer payouts / settlement | Escrow holds and refunds are done; paying the farmer out through Razorpay is not |
| **Backlog** | TURN server for calls | Public STUN only today, so calls behind strict NATs may fail to connect |
| **Backlog** | Contact blocking on review comments | Chat, order notes, and listing copy are scanned; review comments are the last free-text field still unscanned |
| **Backlog** | Razorpay webhook tunnel for local demos | Checkout works without it; webhook needs a public HTTPS URL |

**Risks:** Locale dictionaries still need a native-speaker pass. Voice calls are single-process + public STUN (TURN still backlog).

**Next week:** faculty Prototype + Grounded Kisan demo; optional TURN + farmer payouts.

---

## Archive

### Week 2 — Mon 31 Aug → Mon 7 Sep 2026

| | |
|---|---|
| **Milestone** | **Prototype** — real-time, production-shaped system |
| **Status** | **Green** — Prototype demo-ready; anti-bypass chat guard, in-app voice calls, and payment methods verified against the live API |
| **Closed** | Mon 7 Sep 2026 |

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
| **Done** | API endpoint catalog (boss review) | `docs/API_ENDPOINTS.md` + contract gaps (meta, commodities, outbound) |
| **Done** | Marketplace / mandi load UX | Backend-down message; Haryana in state fallback; `Promise.allSettled` on mandi page; `filters[state]` fix |
| **Done** | Register required fields | Phone, state, district required; village optional |
| **Done** | Localize every screen end to end | Orders, listings, marketplace, dashboards, mandi table, admin, alerts, password, badges, ratings, logo, metadata; `tt()` for non-React modules; locale-aware money/qty/date; `agriconnect.locale` cookie drives `<html lang>` |

**Carried into Week 3:** the whole uncommitted Prototype slice (voice calls, payment methods + escrow refunds, contact guard, 13-locale translation, frontend test layer, localized notifications, RLS) plus the faculty demo.

---

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

_When Week 4 starts (Mon 14 Sep): archive the Week 3 board here, then open Week 4 with fresh **Working on** rows._
