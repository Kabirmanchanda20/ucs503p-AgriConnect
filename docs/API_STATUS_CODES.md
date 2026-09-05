# AgriConnect — API status codes, scenarios, and errors

> Companion to [API_CONTRACT.md](./API_CONTRACT.md). That file is the **request/response shape**. This file is the **HTTP contract**: every status code, who can approve / discard / change, and what the client should do.
>
> **Base URL (dev):** `http://localhost:5001`  
> **Prefix:** `/api/v1` except `/health` and `/ready`  
> **Envelope:** `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message", "fields?" } }`

Frontend teammates: map each table to UI (toasts, disabled buttons, login redirect).  
Backend teammates: do not invent new HTTP codes or `error.code` values without updating this file and the contract.

---

## 1. Shared envelope

### Success

```json
{ "success": true, "data": {} }
```

Paginated lists also include:

```json
{ "success": true, "data": [], "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }
```

Common success HTTP codes:

| HTTP | When |
|---|---|
| **200** | GET, PATCH, DELETE, logout, refresh, reports, most mutations that update in place |
| **201** | Resource created: register, listing, order, photo upload |

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": { "email": ["Invalid email address"] }
  }
}
```

`fields` is present only for Zod / multipart validation failures.

---

## 2. Master error catalog

Use these `error.code` values. Do not return `200` with `{ "error": ... }`.

| HTTP | `error.code` | Trigger | Client fix |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod failed on body, query, or params; missing photo files; invalid UUID param | Show `error.fields` or `error.message`; do not retry the same payload |
| 400 | `INVALID_REQUEST` | Illegal state transition, business rule, malformed JSON, public listing filter not allowed | Change the action (wrong status, missing photos, missing cancellation reason) |
| 400 | `CONFIRM_TEXT_MISMATCH` | `DELETE /users/me` without `{ "confirm": "DELETE" }` | Require the user to type `DELETE` |
| 401 | `UNAUTHORIZED` | Missing `Authorization: Bearer` on a protected route | Send the user to login |
| 401 | `TOKEN_EXPIRED` | Access JWT expired | Call `POST /auth/refresh` (the frontend client does this automatically) then retry |
| 401 | `TOKEN_INVALID` | Tampered, wrong secret, or bad claims | Clear session; login again |
| 401 | `REFRESH_TOKEN_INVALID` | Missing, expired, reused, or rotated refresh cookie | Clear session; login again |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password **or** account lockout (same message) | Show generic login error; wait 15 minutes if locked after 5 failures |
| 403 | `FORBIDDEN` | Wrong role, IDOR-safe hide is **not** this (that is 404), admin self-suspend, admin self-delete | Hide the control in UI; do not retry |
| 403 | `ACCOUNT_SUSPENDED` | Suspended user on a **mutating** route (`requireActiveAccount`) | Show suspended screen; GET `/auth/me` still works |
| 404 | `NOT_FOUND` | Missing resource, wrong id, or “not yours” (IDOR-safe). Also unknown routes | Treat as gone; do not leak existence |
| 409 | `CONFLICT` | Duplicate email, oversell (`quantity` too high), Prisma unique clash (`P2002`) | Change email or reduce order quantity |
| 413 | `PAYLOAD_TOO_LARGE` | Listing photo > 5 MB, or JSON body > 10 kb | Compress image / shrink body |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Photo not JPEG / PNG / WebP | Convert the file |
| 429 | `RATE_LIMIT_EXCEEDED` | `/api` > 100 req/min; `/api/v1/auth` > 10 failed attempts/min | Back off; show “try again shortly” |
| 500 | `INTERNAL_ERROR` | Unexpected / Prisma unknown / storage failure | Retry later; log `message` in non-production |
| 503 | `NOT_READY` | `GET /ready` when Postgres is down | Do not start the frontend against this API |

Prisma `P2025` (record to update not found) is mapped to **404 `NOT_FOUND`**. Malformed JSON body is **400 `INVALID_REQUEST`**.

---

## 3. Auth that applies to almost every route

Assume these extra codes on any authenticated endpoint unless the table says **Auth: No**.

| HTTP | Code | Scenario |
|---|---|---|
| 401 | `UNAUTHORIZED` | No Bearer token |
| 401 | `TOKEN_EXPIRED` | Access token older than ~15 minutes |
| 401 | `TOKEN_INVALID` | Bad signature |
| 403 | `FORBIDDEN` | Role guard failed (e.g. buyer hitting farmer-only) |
| 403 | `ACCOUNT_SUSPENDED` | Mutating route while `isSuspended` |
| 429 | `RATE_LIMIT_EXCEEDED` | Global API limiter |

Suspended users **may** still: refresh, get `/auth/me`, get `/users/me`, list notifications. They **may not** create listings, place orders, change order status, upload photos, or update profiles.

---

## 4. Scenario playbooks: approve, discard, change

The UI does not use the words “approve / discard / change” on every screen. Map them to the live API as follows.

### 4.1 Orders — `PATCH /api/v1/orders/:id/status`

This is the main approve / discard / change endpoint.

| UI intent | Body `status` | Who | From | HTTP success | Side effects |
|---|---|---|---|---|---|
| **Approve** (accept incoming order) | `accepted` | Farmer owner | `pending` | **200** | Notifies buyer + farmer `ORDER_STATUS_CHANGED` |
| **Change** (lock in the deal) | `confirmed` | Farmer owner | `accepted` | **200** | Same notification |
| **Change** (complete) | `fulfilled` | Farmer owner | `confirmed` | **200** | Same notification; counts toward reports GMV |
| **Discard** (buyer backs out) | `cancelled` + `cancellationReason` | Buyer owner | `pending` only | **200** | Restores listing stock; notifies both |
| **Discard** (farmer rejects / stops) | `cancelled` + reason | Farmer owner | `pending`, `accepted`, or `confirmed` | **200** | Restores stock if listing not `removed` |
| **Discard** (admin) | `cancelled` + reason | Admin | `pending`, `accepted`, or `confirmed` | **200** | Admin **cannot** accept/confirm/fulfill |

#### Allowed vs rejected (all return **400 `INVALID_REQUEST`** `"Order status transition is not allowed"` unless noted)

| Actor | From → To | Result |
|---|---|---|
| Farmer owner | pending → accepted | **200** approve |
| Farmer owner | pending → cancelled | **200** discard |
| Farmer owner | accepted → confirmed | **200** change |
| Farmer owner | accepted → cancelled | **200** discard |
| Farmer owner | confirmed → fulfilled | **200** change |
| Farmer owner | confirmed → cancelled | **200** discard |
| Farmer owner | pending → confirmed or fulfilled | **400** skip a step |
| Farmer owner | accepted → fulfilled | **400** skip `confirmed` |
| Farmer owner | fulfilled → anything | **400** terminal |
| Farmer owner | cancelled → anything | **400** terminal |
| Buyer owner | pending → cancelled | **200** discard |
| Buyer owner | pending → accepted | **400** buyers cannot approve |
| Buyer owner | accepted/confirmed → cancelled | **400** too late to discard |
| Admin | * → cancelled | **200** discard only |
| Admin | pending → accepted | **400** admins cannot approve |
| Other user | any | **404 `NOT_FOUND`** (IDOR-safe, not 403) |
| Any | cancelled without `cancellationReason` | **400 `VALIDATION_ERROR`** on `cancellationReason` |
| Any | accepted with a reason | **400 `VALIDATION_ERROR`** reason only valid when cancelling |
| Suspended farmer/buyer | any mutation | **403 `ACCOUNT_SUSPENDED`** |
| Invalid UUID | — | **400 `VALIDATION_ERROR`** |

Example — approve:

```http
PATCH /api/v1/orders/66666666-6666-4666-8666-666666666666/status
Authorization: Bearer <farmerAccessToken>
Content-Type: application/json

{ "status": "accepted" }
```

**200** — order object with `"status": "accepted"`.

Example — discard:

```json
{ "status": "cancelled", "cancellationReason": "Buyer no longer needs the grain" }
```

**200** — `"status": "cancelled"`, stock restored.

Example — illegal change:

```json
{ "status": "fulfilled" }
```

while current status is `pending` → **400**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Order status transition is not allowed"
  }
}
```

---

### 4.2 Farmer listings — publish, unpublish, edit, remove

| UI intent | Call | Success | Notes |
|---|---|---|---|
| Create (always draft) | `POST /listings` | **201** | Sending `"status": "active"` is **400** — no photos yet |
| **Approve** / go live | `PATCH /listings/:id` `{ "status": "active" }` | **200** | Needs ≥1 photo, quantity > 0, MOQ ≤ quantity |
| **Change** fields | `PATCH /listings/:id` crop, price, qty, … | **200** | Owner only |
| **Discard** to draft | `PATCH /listings/:id` `{ "status": "draft" }` | **200** | Only from `active` |
| **Discard** / take down | `DELETE /listings/:id` | **200** `{ "deleted": true }` | Sets `removed` + `deletedAt`; existing orders stay |
| Re-activate sold out / expired | `PATCH` `{ "status": "active" }` | **200** | From `sold_out` or `expired` if stock + photos OK |
| Cannot revive removed | `PATCH` from `removed` | **400** | Only admin moderate can reinstate |

Farmer status machine:

```
draft     → active
active    → draft
sold_out  → active
expired   → active
removed   → (none for farmer)
```

Same-status PATCH is allowed (**200**, no-op on status).

| Scenario | HTTP | Code | Message (typical) |
|---|---|---|---|
| PATCH `draft` → `active` with photos | **200** | — | Listing live |
| PATCH `draft` → `active` with 0 photos | **400** | `INVALID_REQUEST` | `Active listings require at least one photo` |
| PATCH `draft` → `active` with qty 0 | **400** | `INVALID_REQUEST` | `Active listings require available stock` |
| PATCH `draft` → `removed` | **400** | `INVALID_REQUEST` | `Listing status cannot change from draft to removed` |
| PATCH another farmer’s listing | **404** | `NOT_FOUND` | `Listing not found` |
| Buyer calls POST /listings | **403** | `FORBIDDEN` | `Insufficient permissions` |
| Last photo deleted on an active listing | **200** | — | Photo gone; listing forced to `draft` |

---

### 4.3 Admin listing moderation — `PATCH /api/v1/admin/listings/:id/moderate`

| UI intent | Body | Success | Log action | Farmer notification |
|---|---|---|---|---|
| **Discard** / take down | `{ "status": "removed", "reason": "…" }` | **200** | `LISTING_REMOVE` | `LISTING_MODERATED` “Listing removed” |
| **Approve** / reinstate | `{ "status": "active", "reason": "…" }` | **200** | `LISTING_REINSTATE` | `LISTING_MODERATED` “Listing reinstated” |

`reason` is optional (max 500 chars) but the admin UI should send one.

| Scenario | HTTP | Code |
|---|---|---|
| Reinstate with photos + stock | **200** | — |
| Reinstate with 0 photos | **400** | `INVALID_REQUEST` (`Active listings require at least one photo`) |
| Reinstate with no stock | **400** | `INVALID_REQUEST` (`Active listings require available stock`) |
| Listing missing / already hard-deleted | **404** | `NOT_FOUND` |
| Non-admin | **403** | `FORBIDDEN` |
| Body `status: "draft"` | **400** | `VALIDATION_ERROR` (enum is only `removed` \| `active`) |

---

### 4.4 Admin users — verify, suspend, unsuspend

| UI intent | Call | Success |
|---|---|---|
| **Approve** identity | `PATCH /admin/users/:id/verify` `{ "verified": true }` | **200** |
| **Change** (revoke badge) | same, `{ "verified": false }` | **200** |
| **Discard** access | `PATCH /admin/users/:id/suspend` `{ "isSuspended": true, "reason": "…" }` | **200** + `ACCOUNT_SUSPENDED` notification |
| Restore access | `{ "isSuspended": false }` | **200** |

| Scenario | HTTP | Code | Message |
|---|---|---|---|
| Suspend a farmer/buyer | **200** | — | User object, `isSuspended: true` |
| Suspend self | **403** | `FORBIDDEN` | `Admins cannot suspend themselves` |
| Suspend another admin | **403** | `FORBIDDEN` | `Admins cannot suspend other admins` |
| User id missing | **404** | `NOT_FOUND` | `User not found` |

---

## 5. Endpoint catalog (every route, every code)

Codes listed **in addition to** the shared 401/403/429 from §3 where Auth is Yes.

### 5.1 Health

#### `GET /health` — Auth: No

| HTTP | When |
|---|---|
| **200** | Process is up. No DB check. `{ "status": "ok" }` |

#### `GET /ready` — Auth: No

| HTTP | Code | When |
|---|---|---|
| **200** | — | Postgres reachable |
| **503** | `NOT_READY` | Database unavailable |

#### `GET /api/v1/` — Auth: No

| HTTP | When |
|---|---|
| **200** | `{ "name": "AgriConnect API", "version": "v1" }` |

Unknown path → **404 `NOT_FOUND`** `"Route GET /whatever not found"`.

---

### 5.2 Auth (`/api/v1/auth`)

Auth limiter: **10 failed requests / minute** → **429 `RATE_LIMIT_EXCEEDED`**.

#### `POST /register` — Auth: No — **201**

| HTTP | Code | Scenario |
|---|---|---|
| **201** | — | Farmer or buyer created; refresh cookie set; `accessToken` + `user` |
| **400** | `VALIDATION_ERROR` | Bad email, short password, `role: ADMIN`, extra fields |
| **409** | `CONFLICT` | `"Email already registered"` |

#### `POST /login` — Auth: No — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Cookie set; `accessToken` + `user` |
| **400** | `VALIDATION_ERROR` | Missing email/password |
| **401** | `INVALID_CREDENTIALS` | Wrong password, unknown email, **or** locked (5 failures / 15 min). Message is always `"Invalid email or password"` |
| **403** | `ACCOUNT_SUSPENDED` | Valid credentials but `isSuspended` — no session issued |

#### `POST /refresh` — Cookie required — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | New access token + rotated refresh cookie. Suspended users **may** refresh |
| **401** | `REFRESH_TOKEN_INVALID` | No cookie, expired, reused (theft), or already revoked |

#### `POST /logout` — Cookie or Bearer — **200**

| HTTP | When |
|---|---|
| **200** | `{ "loggedOut": true }`, cookie cleared. Safe to call even if already logged out |

#### `GET /me` — Auth: Yes — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Current user + profiles. Suspended users **may** call this |
| **401** | `UNAUTHORIZED` / `TOKEN_*` | No or bad access token |

#### `POST /forgot-password` — Auth: No — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Always the same message, whether or not the email exists (no user enumeration) |
| **400** | `VALIDATION_ERROR` | Invalid email |

#### `POST /reset-password` — Auth: No — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Password changed; **all** refresh tokens revoked |
| **400** | `VALIDATION_ERROR` | Weak/missing password or token |
| **400** | `INVALID_REQUEST` | Token invalid, expired, or already used |

---

### 5.3 Users (`/api/v1/users`)

#### `GET /me` — Auth: Yes — **200** (alias of `/auth/me`)

#### `PATCH /me` — Auth: Yes, active account — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Name / phone / location / language updated (`languagePref`: `en`\|`hi`\|`pa`) |
| **400** | `VALIDATION_ERROR` | Bad field (incl. invalid `languagePref`) |
| **403** | `ACCOUNT_SUSPENDED` | Suspended |

Cannot change `email` or `role` in V1 (ignored / not in schema → extra keys **400**).

#### `GET /me/farmer-profile` · `PATCH /me/farmer-profile` — FARMER

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Profile object |
| **403** | `FORBIDDEN` | Not a farmer |
| **404** | `NOT_FOUND` | Profile row missing |
| **403** | `ACCOUNT_SUSPENDED` | PATCH only |

#### `GET /me/buyer-profile` · `PATCH /me/buyer-profile` — BUYER

Same pattern. `buyerType`: `trader` \| `retailer` \| `bulk` \| `horeca`.

#### `GET /me/export` — Auth: Yes — **200**

DPDP-style dump. Suspended users may export.

#### `DELETE /me` — FARMER \| BUYER — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | `{ "deleted": true }`. Cancels open orders, removes listings, revokes refresh tokens |
| **400** | `CONFIRM_TEXT_MISMATCH` | `confirm` is not exactly `"DELETE"` |
| **403** | `FORBIDDEN` | Admin tried to self-delete |

#### `GET /:id/public` — Auth: No — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Public farmer card (no email/phone/village) |
| **400** | `VALIDATION_ERROR` | Id not a UUID |
| **404** | `NOT_FOUND` | Missing, not a farmer, or deleted |

---

### 5.4 Listings (`/api/v1/listings`)

#### `GET /` — Auth: optional — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Paginated public **active** listings |
| **200** | — | `mine=true` as farmer: own listings (any status except deleted) |
| **400** | `VALIDATION_ERROR` | Bad query |
| **400** | `INVALID_REQUEST` | Non-admin asked for `status` other than `active` without `mine` |
| **403** | `FORBIDDEN` | `mine=true` but not a farmer |

#### `GET /:id` — Auth: optional — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | `active`, `sold_out`, `expired` visible by id; `draft`/`removed` owner or admin only |
| **404** | `NOT_FOUND` | Missing, deleted, or hidden draft/removed |

Increments `viewCount` for non-owners.

#### `POST /` — FARMER, active account — **201**

| HTTP | Code | Scenario |
|---|---|---|
| **201** | — | Always created as **draft** |
| **400** | `VALIDATION_ERROR` | Schema (crop, unit, harvestDate, MOQ > qty, …) |
| **400** | `INVALID_REQUEST` | Client sent `status: "active"` |
| **404** | `NOT_FOUND` | Farmer profile missing |
| **403** | `FORBIDDEN` / `ACCOUNT_SUSPENDED` | Wrong role / suspended |

#### `PATCH /:id` — FARMER owner — **200**

See §4.2. Also **400** if activating without photos/stock/MOQ.

#### `DELETE /:id` — FARMER owner — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Soft-remove. Does **not** cancel existing orders |
| **404** | `NOT_FOUND` | Not owner / missing |

#### `POST /:id/photos` — FARMER owner, multipart `files` — **201**

| HTTP | Code | Scenario |
|---|---|---|
| **201** | — | Photos stored; public URLs returned |
| **400** | `VALIDATION_ERROR` | No files |
| **400** | `INVALID_REQUEST` | Would exceed 5 photos |
| **413** | `PAYLOAD_TOO_LARGE` | File > 5 MB |
| **415** | `UNSUPPORTED_MEDIA_TYPE` | Not jpeg/png/webp |
| **500** | `INTERNAL_ERROR` | Storage upload failed |

#### `DELETE /:id/photos/:photoId` — FARMER owner or ADMIN — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Photo deleted. If it was the last photo on an **active** listing → listing becomes `draft` |
| **404** | `NOT_FOUND` | Listing or photo missing |

---

### 5.5 Orders (`/api/v1/orders`)

All routes: Auth Yes.

#### `POST /` — BUYER, active account — **201**

| HTTP | Code | Scenario |
|---|---|---|
| **201** | — | `status: pending`; listing qty decremented; may set listing `sold_out`; farmer notified `ORDER_PLACED` |
| **400** | `VALIDATION_ERROR` | Bad UUID, qty format, `deliveryMode` not `pickup`/`delivery` |
| **400** | `INVALID_REQUEST` | Qty ≤ 0, below MOQ, or buyer is the listing owner |
| **404** | `NOT_FOUND` | Listing missing or not `active` |
| **409** | `CONFLICT` | `"Insufficient remaining quantity"` (race or oversell) |
| **403** | `FORBIDDEN` / `ACCOUNT_SUSPENDED` | Not a buyer / suspended |

#### `GET /` — FARMER \| BUYER \| ADMIN — **200**

Buyer sees own purchases; farmer sees incoming; admin sees all. Optional `status` filter.

#### `GET /:id` — party or admin — **200** / **404**

#### `PATCH /:id/status` — see **§4.1** (approve / discard / change)

---

### 5.6 Notifications (`/api/v1/notifications`)

Auth Yes. Suspended users may read/mark.

#### `GET /` — **200** paginated. Query: `unread=true`, `page`, `limit`.

#### `PATCH /:id/read` — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | `readAt` set (idempotent if already read) |
| **404** | `NOT_FOUND` | Not yours / missing |

#### `POST /read-all` — **200** `{ "updated": <count> }`

---

### 5.7 Reports

#### `GET /api/v1/reports/me` — FARMER \| BUYER, active account — **200**

| HTTP | Code | Scenario |
|---|---|---|
| **200** | — | Farmer: listings / qty sold / revenue from **fulfilled**. Buyer: order count / spend from **fulfilled** |
| **403** | `FORBIDDEN` | Admin (no personal report) |
| **403** | `ACCOUNT_SUSPENDED` | Suspended |

---

### 5.8 Admin (`/api/v1/admin`)

All: Auth Yes, **ADMIN** only. Non-admin → **403 `FORBIDDEN`**. Mutations write `AdminActivityLog`.

| Method | Path | Success | See |
|---|---|---|---|
| GET | `/users` | **200** paginated | Query `role`, `q`, `suspended` |
| PATCH | `/users/:id/suspend` | **200** | §4.4 discard access |
| PATCH | `/users/:id/verify` | **200** | §4.4 approve identity |
| PATCH | `/listings/:id/moderate` | **200** | §4.3 approve/discard listing |
| GET | `/analytics` | **200** | Users, listings, orders, `gmv` (fulfilled sum) |
| GET | `/activity-logs` | **200** | Query `actorId`, `action`, page |

`GET /admin/reports.csv` is **not implemented**. Calling it → **404 `NOT_FOUND`**.

---

## 6. Frontend handling cheat sheet

| You received | Do this in the UI |
|---|---|
| **200 / 201** | Update cache / local state from `data` |
| **400 VALIDATION_ERROR** | Inline field errors from `error.fields` |
| **400 INVALID_REQUEST** | Toast `error.message` (illegal approve/discard/change) |
| **401 TOKEN_EXPIRED** | Client already refreshes; if still 401 after refresh → login |
| **401 INVALID_CREDENTIALS** | Login form error (do not say “locked” vs “wrong”) |
| **401 others** | Redirect `/login` |
| **403 FORBIDDEN** | Hide the button; send user to their dashboard |
| **403 ACCOUNT_SUSPENDED** | Dedicated suspended page |
| **404** | Not found page (do not say “you don’t own this”) |
| **409** | “Not enough quantity left” or “email taken” |
| **413 / 415** | Photo picker help text |
| **429** | Disable submit briefly |
| **5xx** | Generic retry |

---

## 7. Backend implementation cheat sheet

Throw `new AppError(statusCode, code, message, { fields? })`. The error handler serializes the envelope. Do not `res.json` errors from controllers.

When adding a transition (for example a new order status):

1. Update Prisma enum + migration.
2. Update `order-state-machine.ts` or `listing-status.ts`.
3. Add rows to **§4** and **§5** here.
4. Update [API_CONTRACT.md](./API_CONTRACT.md) examples.
5. Update `frontend/src/lib/api/types.ts` and the screen that renders the buttons.
6. Add a [CHANGELOG.md](./CHANGELOG.md) entry.
