# AgriConnect — API Contract (V1)

> **Base URL (dev):** `http://localhost:5001`
> **API prefix:** `/api/v1`
> **Frontend depends on this document only** — not on Prisma models or file paths.
> **Envelope:** blueprint standard (`success` / `data` / `error`)
> **IDs:** UUID strings
> **Decimals:** JSON **strings** (`"25.00"`, `"500.000"`)
> **Dates:** ISO-8601 UTC (`2026-08-17T16:30:00.000Z`); `harvestDate` is `YYYY-MM-DD`

This is the contract between backend and frontend teammates. Mock responses below are canonical examples.

**Status codes, approve / discard / change scenarios, and every error:** [API_STATUS_CODES.md](./API_STATUS_CODES.md)  
**How to consume this API in Next.js:** [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)  
**How to implement or extend endpoints:** [BACKEND_GUIDE.md](./BACKEND_GUIDE.md)  
**Doc index / handoff:** [README.md](./README.md)

---

## 0. Conventions

### Headers

```
Content-Type: application/json
Authorization: Bearer <accessToken>   # when Auth required = Yes
Cookie: refreshToken=<httpOnly>       # sent automatically with credentials
```

All authenticated browser calls use `credentials: 'include'` / Axios `withCredentials: true`.

### Pagination query

| Param | Default | Max |
|---|---|---|
| `page` | 1 | — |
| `limit` | 20 | 100 |

Paginated responses:

```json
{
  "success": true,
  "data": [],
  "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### Auth column legend

- **Auth:** No | Yes
- **Roles:** `public` | `FARMER` | `BUYER` | `ADMIN` | `any authenticated`

### Error codes (master)

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod failed |
| 400 | `INVALID_REQUEST` | Illegal state transition or business rule |
| 401 | `UNAUTHORIZED` | No access token |
| 401 | `TOKEN_EXPIRED` | Access JWT expired — client must refresh |
| 401 | `TOKEN_INVALID` | Tampered / wrong secret |
| 401 | `REFRESH_TOKEN_INVALID` | Missing, expired, reused, or rotated refresh |
| 401 | `INVALID_CREDENTIALS` | Login failed (generic) |
| 403 | `FORBIDDEN` | Wrong role |
| 403 | `ACCOUNT_SUSPENDED` | Suspended user on a mutating route |
| 404 | `NOT_FOUND` | Missing or not owned (IDOR-safe) |
| 409 | `CONFLICT` | Duplicate email, oversell, unique clash |
| 413 | `PAYLOAD_TOO_LARGE` | File or body too large |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Bad image MIME |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected |
| 503 | `NOT_READY` | `/ready` when DB down |

Error body:

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

---

## 1. Health

### GET /health

**Description:** Liveness. Process is up. No DB.
**Auth:** No  
**Roles:** public

#### Response — 200

```json
{ "success": true, "data": { "status": "ok" } }
```

---

### GET /ready

**Description:** Readiness. Postgres reachable via Prisma.
**Auth:** No  
**Roles:** public

#### Response — 200

```json
{ "success": true, "data": { "status": "ready", "database": "up" } }
```

#### Response — 503

```json
{ "success": false, "error": { "code": "NOT_READY", "message": "Database unavailable" } }
```

---

## 2. Auth

Cookie set on login/register/refresh:

```
Set-Cookie: refreshToken=<opaque>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

Logout clears the cookie (`Max-Age=0`).

Access token is **only** in JSON `data.accessToken`, never in localStorage.

---

### POST /api/v1/auth/register

**Description:** Create farmer or buyer account and matching profile.
**Auth:** No  
**Roles:** public  
**Rate limit:** strict auth limiter

#### Request

```json
{
  "email": "farmer@example.com",
  "password": "CorrectHorse9!",
  "name": "Ravi Kumar",
  "role": "FARMER",
  "phone": "+919876543210",
  "state": "Punjab",
  "district": "Ludhiana",
  "village": "Sahnewal",
  "languagePref": "en"
}
```

| Field | Required | Rules |
|---|---|---|
| email | yes | valid email, unique |
| password | yes | min 8, max 128 |
| name | yes | 1–100 chars |
| role | yes | `FARMER` or `BUYER` only (`ADMIN` rejected) |
| phone | no | string |
| state, district, village | no | strings |
| languagePref | no | default `en` |

#### Response — 201

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "farmer@example.com",
      "name": "Ravi Kumar",
      "role": "FARMER",
      "phone": "+919876543210",
      "languagePref": "en",
      "state": "Punjab",
      "district": "Ludhiana",
      "village": "Sahnewal",
      "verified": false,
      "isSuspended": false,
      "createdAt": "2026-08-17T16:00:00.000Z"
    }
  }
}
```

Sets refresh cookie.

#### Errors

- 400 `VALIDATION_ERROR`
- 409 `CONFLICT` — email taken (`"Email already registered"`)

#### Business rules

- Creating `FARMER` inserts empty `FarmerProfile`.
- Creating `BUYER` inserts `BuyerProfile` with `buyerType: "trader"`.
- Password never returned.

---

### POST /api/v1/auth/login

**Description:** Authenticate with email/password.
**Auth:** No  
**Roles:** public

#### Request

```json
{
  "email": "farmer@example.com",
  "password": "CorrectHorse9!"
}
```

#### Response — 200

Same shape as register `data` (`accessToken` + `user`). Sets refresh cookie.

#### Errors

- 401 `INVALID_CREDENTIALS` — `"Invalid email or password"` (also used when locked)
- 403 `ACCOUNT_SUSPENDED` — `"This account has been suspended"` (valid credentials but account suspended)
- 400 `VALIDATION_ERROR`

---

### POST /api/v1/auth/refresh

**Description:** Rotate refresh cookie; issue new access token.
**Auth:** Refresh cookie (no Bearer required)
**Roles:** public (cookie-gated)

#### Request

Empty body `{}`. Cookie required.

#### Response — 200

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

Sets new refresh cookie.

#### Errors

- 401 `REFRESH_TOKEN_INVALID`

#### Business rules

- Rotation + reuse detection (see architecture).
- Suspended users **may** refresh so the client can load `/me` and show suspended UI.

---

### POST /api/v1/auth/logout

**Description:** Revoke current refresh token; clear cookie.
**Auth:** Yes (access token) **or** refresh cookie  
**Roles:** any authenticated preferred; cookie-only also accepted so expired access still logs out

#### Request

Empty body.

#### Response — 200

```json
{ "success": true, "data": { "loggedOut": true } }
```

---

### GET /api/v1/auth/me

**Description:** Current user from access token.
**Auth:** Yes  
**Roles:** any authenticated

#### Response — 200

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "farmer@example.com",
    "name": "Ravi Kumar",
    "role": "FARMER",
    "phone": "+919876543210",
    "languagePref": "en",
    "state": "Punjab",
    "district": "Ludhiana",
    "village": "Sahnewal",
    "verified": false,
    "isSuspended": false,
    "createdAt": "2026-08-17T16:00:00.000Z",
    "farmerProfile": {
      "id": "22222222-2222-4222-8222-222222222222",
      "farmName": "Kumar Farms",
      "region": "Punjab",
      "ratingAvg": null
    },
    "buyerProfile": null
  }
}
```

Buyer example: `farmerProfile: null`, `buyerProfile` object present. Admin: both null.

---

### POST /api/v1/auth/forgot-password

**Description:** Request password reset email.
**Auth:** No  
**Roles:** public

#### Request

```json
{ "email": "farmer@example.com" }
```

#### Response — 200

Always the same, whether or not the email exists:

```json
{
  "success": true,
  "data": {
    "message": "If that email is registered, a reset link has been sent."
  }
}
```

#### Business rules

- Token TTL 1 hour.
- Email contains `{CLIENT_URL}/reset-password?token=<rawToken>`.

---

### POST /api/v1/auth/reset-password

**Description:** Set a new password using the email token.
**Auth:** No  
**Roles:** public

#### Request

```json
{
  "token": "raw-token-from-email",
  "password": "NewCorrectHorse9!"
}
```

#### Response — 200

```json
{ "success": true, "data": { "reset": true } }
```

#### Errors

- 400 `INVALID_REQUEST` — token invalid, expired, or used
- 400 `VALIDATION_ERROR`

Revokes **all** refresh tokens for that user after success.

---

## 3. Users & profiles

`GET /api/v1/users/me` is an alias of `GET /api/v1/auth/me` (same payload). Frontend may use either; **prefer `/auth/me`**.

---

### PATCH /api/v1/users/me

**Description:** Update basic profile fields (not role, not email in V1).
**Auth:** Yes  
**Roles:** any authenticated

#### Request (all optional)

```json
{
  "name": "Ravi Kumar",
  "phone": "+919876543210",
  "languagePref": "en",
  "state": "Punjab",
  "district": "Ludhiana",
  "village": "Sahnewal"
}
```

#### Response — 200

`data` = user object (same fields as login `user`, without profiles).

---

### GET /api/v1/users/me/farmer-profile

**Auth:** Yes  
**Roles:** FARMER

#### Response — 200

```json
{
  "success": true,
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "farmName": "Kumar Farms",
    "region": "Punjab",
    "ratingAvg": null
  }
}
```

403 if role is not FARMER.

---

### PATCH /api/v1/users/me/farmer-profile

**Auth:** Yes  
**Roles:** FARMER

#### Request

```json
{
  "farmName": "Kumar Farms",
  "region": "Ludhiana, Punjab"
}
```

#### Response — 200 — updated profile object.

---

### GET /api/v1/users/me/buyer-profile  
### PATCH /api/v1/users/me/buyer-profile

**Auth:** Yes  
**Roles:** BUYER

#### GET 200

```json
{
  "success": true,
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "businessName": "Singh Traders",
    "buyerType": "trader",
    "ratingAvg": null
  }
}
```

#### PATCH body

```json
{
  "businessName": "Singh Traders",
  "buyerType": "horeca"
}
```

`buyerType`: `trader` | `retailer` | `bulk` | `horeca`

---

### GET /api/v1/users/me/export

**Description:** DPDP-style export of the caller’s data.
**Auth:** Yes  
**Roles:** any authenticated

#### Response — 200

```json
{
  "success": true,
  "data": {
    "user": {},
    "farmerProfile": null,
    "buyerProfile": null,
    "listings": [],
    "orders": [],
    "notifications": []
  }
}
```

---

### DELETE /api/v1/users/me

**Description:** Soft-delete own account.
**Auth:** Yes  
**Roles:** FARMER | BUYER (not ADMIN)

#### Request

```json
{ "confirm": "DELETE" }
```

#### Response — 200

```json
{ "success": true, "data": { "deleted": true } }
```

#### Errors

- 400 `CONFIRM_TEXT_MISMATCH` if `confirm` !== `"DELETE"`
- 403 `FORBIDDEN` for admin self-delete

Cancels pending orders; removes active listings (`removed`); revokes refresh tokens.

---

### GET /api/v1/users/:id/public

**Description:** Public farmer summary for listing detail (no email/phone).
**Auth:** No  
**Roles:** public

#### Response — 200

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Ravi Kumar",
    "role": "FARMER",
    "state": "Punjab",
    "district": "Ludhiana",
    "verified": true,
    "farmName": "Kumar Farms",
    "ratingAvg": null
  }
}
```

404 if user missing, not a farmer, or deleted. Village omitted.

---

## 4. Listings

### Listing object (full, owner/admin)

```json
{
  "id": "44444444-4444-4444-8444-444444444444",
  "farmerProfileId": "22222222-2222-4222-8222-222222222222",
  "farmer": {
    "userId": "11111111-1111-4111-8111-111111111111",
    "name": "Ravi Kumar",
    "state": "Punjab",
    "district": "Ludhiana",
    "verified": false,
    "farmName": "Kumar Farms",
    "ratingAvg": null
  },
  "crop": "Wheat",
  "category": "grains",
  "variety": "HD-2967",
  "quantity": "500.000",
  "unit": "kg",
  "pricePerUnit": "25.00",
  "harvestDate": "2026-04-10",
  "state": "Punjab",
  "district": "Ludhiana",
  "village": "Sahnewal",
  "description": "Freshly harvested wheat, stored dry.",
  "minimumOrderQuantity": "50.000",
  "status": "active",
  "perishable": false,
  "viewCount": 12,
  "interestCount": 3,
  "expiresAt": "2026-04-24T00:00:00.000Z",
  "photos": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "publicUrl": "https://<project>.supabase.co/storage/v1/object/public/listings/...",
      "sortOrder": 0
    }
  ],
  "createdAt": "2026-08-17T16:10:00.000Z",
  "updatedAt": "2026-08-17T16:10:00.000Z"
}
```

**Public listing object:** same, but `village` is `null` unless the caller is owner, related buyer, or admin.

---

### POST /api/v1/listings

**Description:** Create a listing (farmer).
**Auth:** Yes  
**Roles:** FARMER

#### Request

```json
{
  "crop": "Wheat",
  "category": "grains",
  "variety": "HD-2967",
  "quantity": "500",
  "unit": "kg",
  "pricePerUnit": "25.00",
  "harvestDate": "2026-04-10",
  "state": "Punjab",
  "district": "Ludhiana",
  "village": "Sahnewal",
  "description": "Freshly harvested wheat, stored dry.",
  "minimumOrderQuantity": "50",
  "status": "draft",
  "perishable": false
}
```

| Field | Required | Rules |
|---|---|---|
| crop | yes | 1–80 chars |
| category | yes | 1–80 chars |
| variety | no | |
| quantity | yes | positive decimal string or number (coerced) |
| unit | yes | `kg` \| `quintal` \| `ton` |
| pricePerUnit | yes | ≥ 0, 2 decimal money |
| harvestDate | yes | ISO date, not in far future (> 2 years rejected) |
| state, district | yes | |
| village | no | |
| description | no | max 2000 |
| minimumOrderQuantity | yes | > 0, ≤ quantity |
| status | no | `draft` (default) or `active` |
| perishable | yes | boolean |

#### Response — 201 — full listing (`photos: []`).

If `status` is `active` with zero photos → 400 `INVALID_REQUEST` (`"Active listings require at least one photo"`). Client should create as `draft`, upload photos, then PATCH status to `active`.

403 `ACCOUNT_SUSPENDED` if suspended.

---

### GET /api/v1/listings

**Description:** Search/browse listings.
**Auth:** No for public active browse; Yes for `mine=true`
**Roles:** public (default); FARMER when `mine=true`

#### Query

| Param | Description |
|---|---|
| `crop` | case-insensitive contains |
| `category` | exact or contains |
| `state` | exact |
| `district` | exact |
| `minPrice` / `maxPrice` | pricePerUnit range |
| `minQuantity` | remaining quantity ≥ |
| `harvestFrom` / `harvestTo` | dates |
| `perishable` | `true` / `false` |
| `status` | default `active` for public |
| `mine` | `true` = caller’s listings (any status except deleted); requires FARMER |
| `sort` | `createdAt_desc` (default), `price_asc`, `price_desc`, `harvestDate_asc` |
| `page`, `limit` | pagination |

Public default: `status=active` only. Non-admin cannot pass `status=removed`.

#### Response — 200 — paginated array of listing objects (public shape).

---

### GET /api/v1/listings/:id

**Description:** Listing detail. Increments `viewCount` for non-owners.
**Auth:** No  
**Roles:** public

#### Response — 200 — listing object.

404 if missing, deleted, or (`removed`/`draft` and caller is not owner/admin).

`draft` / `removed` / `expired` / `sold_out` visible to owner and admin; `sold_out` and `expired` also visible by direct id to any authenticated user (read-only history). **V1 rule:** public GET by id returns `active`, `sold_out`, and `expired`. `draft` and `removed` are owner/admin only.

---

### PATCH /api/v1/listings/:id

**Description:** Update own listing.
**Auth:** Yes  
**Roles:** FARMER (owner)

Body: any subset of create fields except identity. Cannot change `farmerProfileId`.

Cannot PATCH another farmer’s listing (404).

If setting `status: "active"`, photo count must be ≥ 1.

#### Response — 200 — full listing.

---

### DELETE /api/v1/listings/:id

**Description:** Soft-delete / remove own listing.
**Auth:** Yes  
**Roles:** FARMER (owner)

Sets `status=removed`, `deletedAt=now()`. Does not cancel existing orders.

#### Response — 200

```json
{ "success": true, "data": { "deleted": true } }
```

---

### POST /api/v1/listings/:id/photos

**Description:** Upload 1–5 images (multipart).
**Auth:** Yes  
**Roles:** FARMER (owner)

`Content-Type: multipart/form-data`  
Field name: `files` (repeat) or `files[]`

Constraints: jpeg/png/webp, ≤ 5 MB each, listing total photos ≤ 5.

#### Response — 201

```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "55555555-5555-4555-8555-555555555555",
        "publicUrl": "https://example.supabase.co/storage/v1/object/public/listings/4444/uuid.webp",
        "sortOrder": 0
      }
    ]
  }
}
```

#### Errors

- 400 too many photos
- 413 file too large
- 415 bad MIME

---

### DELETE /api/v1/listings/:id/photos/:photoId

**Auth:** Yes  
**Roles:** FARMER (owner) or ADMIN

#### Response — 200

```json
{ "success": true, "data": { "deleted": true } }
```

If listing is `active` and this was the last photo → listing forced to `draft`.

---

## 5. Orders

### Order object

```json
{
  "id": "66666666-6666-4666-8666-666666666666",
  "listingId": "44444444-4444-4444-8444-444444444444",
  "buyerId": "77777777-7777-4777-8777-777777777777",
  "farmerId": "11111111-1111-4111-8111-111111111111",
  "quantity": "100.000",
  "unit": "kg",
  "pricePerUnit": "25.00",
  "priceTotal": "2500.00",
  "status": "pending",
  "deliveryMode": "pickup",
  "logisticsStatus": "none",
  "dispatchedAt": null,
  "inTransitAt": null,
  "logisticsDeliveredAt": null,
  "payment": null,
  "notes": "Will collect Thursday morning",
  "cancellationReason": null,
  "listing": {
    "id": "44444444-4444-4444-8444-444444444444",
    "crop": "Wheat",
    "status": "active",
    "photos": []
  },
  "buyer": { "id": "77777777-7777-4777-8777-777777777777", "name": "Aman Singh", "ratingAvg": "4.50" },
  "farmer": { "id": "11111111-1111-4111-8111-111111111111", "name": "Ravi Kumar", "ratingAvg": "4.80" },
  "createdAt": "2026-08-17T17:00:00.000Z",
  "updatedAt": "2026-08-17T17:00:00.000Z"
}
```

---

### POST /api/v1/orders

**Description:** Buyer places an order against an active listing.
**Auth:** Yes  
**Roles:** BUYER

#### Request

```json
{
  "listingId": "44444444-4444-4444-8444-444444444444",
  "quantity": "100",
  "deliveryMode": "pickup",
  "notes": "Will collect Thursday morning"
}
```

#### Response — 201 — order object (`status: "pending"`).

#### Errors

- 400 `INVALID_REQUEST` — quantity < MOQ, listing not active, buyer ordering own produce (if same email somehow — farmers cannot be buyers in V1)
- 409 `CONFLICT` — insufficient remaining quantity
- 403 `ACCOUNT_SUSPENDED`
- 404 listing not found / not active (treat inactive as 404 for buyers)

#### Business rules

- Server snapshots `unit`, `pricePerUnit`, `priceTotal`.
- Decrements listing quantity; may set `sold_out`.
- Increments `interestCount`.
- Notifies farmer (`ORDER_PLACED`) + email.

---

### GET /api/v1/orders

**Description:** List orders visible to the caller.
**Auth:** Yes  
**Roles:** FARMER | BUYER | ADMIN

#### Query

| Param | Description |
|---|---|
| `status` | filter |
| `page`, `limit` | pagination |

- BUYER: own orders (`buyerId = me`)
- FARMER: incoming (`farmerId = me`)
- ADMIN: all

#### Response — 200 — paginated order objects.

---

### GET /api/v1/orders/:id

**Auth:** Yes  
**Roles:** buyer owner, farmer owner, or ADMIN

Others: 404.

#### Response — 200 — order object.

---

### PATCH /api/v1/orders/:id/status

**Description:** Advance or cancel per state machine.
**Auth:** Yes  
**Roles:** FARMER (seller) | BUYER (cancel pending only) | ADMIN

#### Request

```json
{
  "status": "accepted",
  "cancellationReason": null
}
```

`cancellationReason` required when `status` is `cancelled`.

#### Response — 200 — updated order.

#### Errors

- 400 `INVALID_REQUEST` — illegal transition or actor not allowed
- 404

#### Allowed transitions (must match [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) §6.2)

```
pending → accepted | cancelled
accepted → confirmed | cancelled
confirmed → fulfilled | cancelled
```

On `cancelled` from `pending`/`accepted`/`confirmed`: restore reserved quantity if listing not `removed`.

Notifies both parties (`ORDER_STATUS_CHANGED`).

---

### GET /api/v1/orders/:id/messages

**Description:** Paginated order chat history (buyer ↔ farmer).
**Auth:** Yes  
**Roles:** order buyer or farmer

#### Response — 200 — paginated message objects.

```json
{
  "success": true,
  "data": [
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "orderId": "66666666-6666-4666-8666-666666666666",
      "senderId": "11111111-1111-4111-8111-111111111111",
      "sender": { "id": "11111111-1111-4111-8111-111111111111", "name": "Ravi Kumar" },
      "body": "Can you deliver tomorrow morning?",
      "sentAt": "2026-08-17T17:05:00.000Z",
      "readAt": null
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```

---

### POST /api/v1/orders/:id/messages

**Description:** Send a message on an order thread. Persists to DB and pushes `message:new` over Socket.io to room `order:{orderId}`.
**Auth:** Yes (active account)  
**Roles:** order buyer or farmer

#### Request

```json
{ "body": "Can you deliver tomorrow morning?" }
```

#### Response — 201 — message object.

#### Errors

- 400 `INVALID_REQUEST` — order is `cancelled`
- 404 — order not found or not a participant

---

### POST /api/v1/orders/:id/messages/read

**Description:** Mark all messages from the counterparty as read.
**Auth:** Yes (active account)

#### Response — 200

```json
{ "success": true, "data": { "orderId": "66666666-6666-4666-8666-666666666666", "markedRead": 2 } }
```

---

### Real-time chat (Socket.io)

- **Path:** `/socket.io` on the same host as the API (e.g. `http://localhost:5001`)
- **Auth:** pass access JWT in handshake `auth.token` or `Authorization: Bearer`
- **Join room:** emit `join:order` with `orderId` (ack returns `{ ok: true }`)
- **Receive:** listen for `message:new` (same shape as REST message object)
- **Typing (V2):** emit `typing:start` with `{ orderId }`; counterparty receives `typing` with `{ orderId, userId }`

---

### PATCH /api/v1/orders/:id/logistics

**Description:** Farmer advances logistics checkpoints on a non-cancelled order.
**Auth:** Yes (active account)  
**Roles:** FARMER (order seller)

#### Request

```json
{ "logisticsStatus": "dispatched" }
```

Allowed values: `dispatched` → `in_transit` → `delivered` (from `none` only `dispatched`).

#### Response — 200 — updated order object.

#### Errors

- 400 `INVALID_REQUEST` — illegal transition or order `cancelled`
- 403 `FORBIDDEN` — not the farmer
- 404

Notifies buyer (`ORDER_STATUS_CHANGED`).

---

### POST /api/v1/orders/:id/payment

**Description:** Buyer initiates escrow-style payment for an order.
**Auth:** Yes (active account)  
**Roles:** BUYER

#### Response — 201

**Mock mode** (no Razorpay keys):

```json
{
  "success": true,
  "data": {
    "paymentId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "orderId": "66666666-6666-4666-8666-666666666666",
    "amount": "2500.00",
    "currency": "INR",
    "status": "pending",
    "mode": "mock",
    "message": "Razorpay keys are not configured..."
  }
}
```

**Razorpay sandbox** (`RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` set):

```json
{
  "success": true,
  "data": {
    "paymentId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "orderId": "66666666-6666-4666-8666-666666666666",
    "amount": "2500.00",
    "currency": "INR",
    "status": "authorized",
    "mode": "razorpay",
    "razorpayOrderId": "order_xxx",
    "keyId": "rzp_test_xxx"
  }
}
```

#### Errors

- 400 `INVALID_REQUEST` — order `cancelled`
- 404
- 502 `PAYMENT_UNAVAILABLE` — Razorpay API error

---

### POST /api/v1/orders/:id/payment/confirm

**Description:** Mark payment as **held** (mock confirm or after Razorpay checkout). On order `fulfilled`, server releases held payment to `released`.
**Auth:** Yes (active account)  
**Roles:** BUYER

#### Response — 200

```json
{
  "success": true,
  "data": {
    "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    "status": "held",
    "heldAt": "2026-08-18T10:00:00.000Z"
  }
}
```

#### Errors

- 404 — payment not found

---

## 5c. Market prices (V2)

Public read-only mandi-style price trends (internal trades + seeded Agmarknet samples).

### GET /api/v1/market/prices

**Auth:** No

#### Query

| Param | Default | Description |
|---|---|---|
| `crop` | — | filter |
| `state` | — | filter |
| `days` | 90 | window |
| `limit` | 120 | max rows |

#### Response — 200 — array of price trend points.

---

### GET /api/v1/market/prices/summary

**Auth:** No

Same query params. Returns latest price per crop/state in the window.

---

### POST /api/v1/market/prices/compare

**Auth:** No

Compare listing prices to latest Agmarknet mandi reference (₹/kg) per crop and state.

#### Body

```json
{
  "items": [
    {
      "id": "uuid",
      "crop": "Wheat",
      "state": "Punjab",
      "pricePerUnit": "24.50",
      "unit": "kg"
    }
  ]
}
```

| Field | Rules |
|---|---|
| `items` | 1–50 objects |
| `id` | UUID (echoed in response) |
| `unit` | `kg` \| `quintal` \| `ton` |

#### Response — 200

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "listingPricePerKg": "24.50",
      "mandiPricePerKg": "26.00",
      "diffPerKg": "-1.50",
      "diffPercent": -6,
      "verdict": "below_mandi"
    }
  ]
}
```

`verdict`: `below_mandi` (≥2% under mandi), `above_mandi` (≥2% over), `at_mandi`, or `unknown` (no mandi row).

#### Errors

| Status | When |
|---|---|
| 400 | Invalid body (Zod) |

---

### GET /api/v1/market/mandi/prices

**Description:** Live wholesale mandi prices from Govt Agmarknet (synced via data.gov.in open feed). Default state **Punjab**.
**Auth:** No

#### Query

| Param | Default | Description |
|---|---|---|
| `state` | Punjab | Indian state |
| `commodity` | — | e.g. `Wheat` |
| `market` | — | APMC name filter |

#### Response — 200

```json
{
  "success": true,
  "data": [
    {
      "state": "Punjab",
      "district": "Fazilka",
      "market": "Abohar APMC",
      "commodity": "Wheat",
      "arrivalDate": "2026-08-28",
      "minPrice": 2610,
      "maxPrice": 2615,
      "modalPrice": 2610,
      "unit": "quintal",
      "pricePerKg": "26.10",
      "source": "agmarknet",
      "fetchedAt": "2026-08-28T23:43:56.945+00:00"
    }
  ]
}
```

Prices are **₹/quintal** from mandi; `pricePerKg` is derived for charts.

#### Errors

- 502 `MANDI_FEED_UNAVAILABLE` — upstream feed unreachable

---

### GET /api/v1/market/mandi/history

**Auth:** No

#### Query

| Param | Required | Description |
|---|---|---|
| `state` | no (default Punjab) | state |
| `commodity` | yes | crop name |
| `market` | no | APMC |
| `from`, `to` | no | `YYYY-MM-DD` range |

#### Response — 200 — daily averaged mandi modal/min/max with `avgModalPricePerKg`.

---

### GET /api/v1/market/mandi/states

**Auth:** No — list states covered by the feed (Maharashtra, UP, Punjab, MP, Karnataka).

### GET /api/v1/market/mandi/markets

**Auth:** No — query `state` required; lists APMCs in that state.

Server syncs mandi rows into `price_trends` on startup and daily when `MANDI_SYNC_ENABLED=true`.

---

## 5d. Buyer produce alerts (V2)

### GET /api/v1/alerts

**Auth:** Yes  
**Roles:** BUYER

#### Response — 200 — array of alert objects.

---

### POST /api/v1/alerts

**Auth:** Yes (active account)  
**Roles:** BUYER

#### Request

```json
{ "crop": "Wheat", "state": "Punjab" }
```

Both fields optional (`null` = any). Duplicate `(userId, crop, state)` → 409.

#### Response — 201 — alert object.

---

### DELETE /api/v1/alerts/:id

**Auth:** Yes (active account)  
**Roles:** BUYER (owner)

#### Response — 200 — `{ "deleted": true }`

#### Errors

- 404

---

When a farmer **publishes** a listing, matching buyers receive `LISTING_PUBLISHED` notifications (crop/state alerts + same-state buyers). Hourly jobs warn farmers of listings expiring within 3 days (`LISTING_EXPIRING`) and auto-expire due listings.

---

## 5b. Reviews

### Review object

```json
{
  "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "orderId": "66666666-6666-4666-8666-666666666666",
  "fromUserId": "77777777-7777-4777-8777-777777777777",
  "toUserId": "11111111-1111-4111-8111-111111111111",
  "rating": 5,
  "comment": "Fresh produce, on time.",
  "fromUser": { "id": "77777777-7777-4777-8777-777777777777", "name": "Aman Singh" },
  "toUser": { "id": "11111111-1111-4111-8111-111111111111", "name": "Ravi Kumar" },
  "createdAt": "2026-08-18T10:00:00.000Z"
}
```

`ratingAvg` on `FarmerProfile` / `BuyerProfile` updates when a review is submitted.

---

### POST /api/v1/orders/:id/reviews

**Description:** Rate the counterparty after fulfillment (buyer → farmer, farmer → buyer).
**Auth:** Yes  
**Roles:** order buyer or farmer

#### Request

```json
{ "rating": 5, "comment": "Fresh produce, on time." }
```

#### Response — 201 — review object.

#### Errors

- 400 — order not `fulfilled`
- 409 `CONFLICT` — already reviewed this order

---

### GET /api/v1/orders/:id/reviews

**Auth:** Yes — order participants

#### Response — 200 — paginated reviews for the order.

---

### GET /api/v1/orders/:id/reviews/me

**Auth:** Yes — returns caller's review for this order or `null`.

---

### GET /api/v1/users/:id/reviews

**Description:** Public list of reviews received by a user (farmer or buyer profile).
**Auth:** No

#### Response — 200 — paginated review objects.

---

## 6. Notifications

### GET /api/v1/notifications

**Auth:** Yes  
**Roles:** any authenticated

#### Query

`unread=true` optional; `page`, `limit`

#### Response — 200

```json
{
  "success": true,
  "data": [
    {
      "id": "88888888-8888-4888-8888-888888888888",
      "type": "ORDER_PLACED",
      "title": "New order",
      "body": "Aman Singh ordered 100 kg of Wheat.",
      "readAt": null,
      "relatedEntityType": "Order",
      "relatedEntityId": "66666666-6666-4666-8666-666666666666",
      "createdAt": "2026-08-17T17:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### PATCH /api/v1/notifications/:id/read

**Auth:** Yes (owner)

#### Response — 200 — notification with `readAt` set.

---

### POST /api/v1/notifications/read-all

**Auth:** Yes

#### Response — 200

```json
{ "success": true, "data": { "updated": 4 } }
```

---

## 7. Reports

### GET /api/v1/reports/me

**Auth:** Yes  
**Roles:** FARMER | BUYER

#### Farmer 200

```json
{
  "success": true,
  "data": {
    "role": "FARMER",
    "totalListings": 8,
    "totalQuantitySold": "1200.000",
    "revenue": "30000.00"
  }
}
```

`totalQuantitySold` / `revenue` from orders in `fulfilled` only.

#### Buyer 200

```json
{
  "success": true,
  "data": {
    "role": "BUYER",
    "totalOrders": 5,
    "totalSpend": "12500.00"
  }
}
```

`totalSpend` from `fulfilled` (V1; pending not counted).

---

## 7b. Assistant (Kisan)

### GET /api/v1/assistant/status

**Description:** Check whether the Gemini-backed farm assistant is configured and reachable.
**Auth:** Yes

#### Response — 200

```json
{
  "success": true,
  "data": {
    "configured": true,
    "connected": true,
    "model": "gemini-3.6-flash",
    "source": "gemini"
  }
}
```

`source: "local"` when `GEMINI_API_KEY` is missing or the model endpoint is unreachable.

---

### POST /api/v1/assistant/query

**Description:** Ask Kisan (role-aware Gemini chatbot).
**Auth:** Yes  
**Rate limit:** 20 requests / minute

#### Request

```json
{
  "message": "How do I list wheat?",
  "history": [{ "role": "user", "content": "Hi" }, { "role": "assistant", "content": "Namaste!" }]
}
```

`message` max **800** characters. Each `history` turn max **4000** characters (longer turns are clipped); up to **8** prior turns.

#### Response — 200

```json
{
  "success": true,
  "data": {
    "reply": "Create a draft listing, add photos, then publish.",
    "source": "gemini"
  }
}
```

---

## 8. Admin

All admin routes: **Auth Yes, Roles ADMIN**. Non-admin → 403. Every mutating admin action writes `AdminActivityLog`.

---

### GET /api/v1/admin/users

Query: `role`, `q` (email/name), `suspended=true|false`, `page`, `limit`

#### Response — 200 — paginated users (include email, `isSuspended`, `verified`, `createdAt`; no password).

---

### PATCH /api/v1/admin/users/:id/suspend

#### Request

```json
{ "isSuspended": true, "reason": "Fraudulent listings" }
```

#### Response — 200 — user object.

Cannot suspend another admin (403 `CANNOT_SELF_DEMOTE` / `FORBIDDEN`). Cannot suspend self.

Notifies user `ACCOUNT_SUSPENDED` when true.

---

### PATCH /api/v1/admin/users/:id/verify

#### Request

```json
{ "verified": true }
```

#### Response — 200 — user object (`verified` badge).

---

### PATCH /api/v1/admin/listings/:id/moderate

#### Request

```json
{
  "status": "removed",
  "reason": "Misleading photos"
}
```

Allowed admin statuses: `removed`, `active` (reinstate if not deleted).

#### Response — 200 — listing object.

Notifies farmer `LISTING_MODERATED`.

---

### GET /api/v1/admin/analytics

#### Response — 200

```json
{
  "success": true,
  "data": {
    "totalUsers": 120,
    "usersByRole": { "FARMER": 70, "BUYER": 49, "ADMIN": 1 },
    "totalListings": 200,
    "activeListings": 80,
    "totalOrders": 340,
    "gmv": "1250000.00"
  }
}
```

`gmv` = sum of `priceTotal` for orders with status `fulfilled` (V1 proxy).

---

### GET /api/v1/admin/activity-logs

Query: `page`, `limit`, `actorId`, `action`

#### Response — 200 — paginated logs:

```json
{
  "id": "99999999-9999-4999-8999-999999999999",
  "actorId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "action": "USER_SUSPEND",
  "targetType": "User",
  "targetId": "11111111-1111-4111-8111-111111111111",
  "metadata": { "reason": "Fraudulent listings" },
  "createdAt": "2026-08-17T18:00:00.000Z"
}
```

---

### GET /api/v1/admin/reports.csv

**Optional V1.** If unimplemented, frontend must not depend on it.

`Content-Type: text/csv`  
Auth ADMIN  
Same metrics as analytics, flattened.

---

## 9. Frontend mock: complete happy path

Use these literals in UI development before the API exists.

1. **Register farmer** → 201 example in §2 register  
2. **Create listing draft** → 201 with `status: "draft"`, empty photos  
3. **Upload photo** → 201 photos array  
4. **PATCH listing** `{ "status": "active" }` → 200  
5. **Register buyer / login** → 200  
6. **GET /listings?crop=Wheat** → one active listing  
7. **POST /orders** → 201 pending  
8. **Farmer PATCH status accepted → confirmed → fulfilled**  
9. **GET /reports/me** on both sides  
10. **Admin GET /admin/analytics**

---

## 10. Endpoints the frontend must not call

- Supabase REST `/rest/v1/*`
- Supabase Auth
- Direct Storage upload with service role
- Any `/api/v2` or Socket.io events (V2)
- ML service URLs (V3)

---

## 11. CORS and cookies

`CORS_ORIGINS` includes the Next.js origin (dev: `http://localhost:3000`).  
`credentials: true`.  
Refresh cookie `Path=/api/v1/auth` so it is sent to refresh/logout only.
