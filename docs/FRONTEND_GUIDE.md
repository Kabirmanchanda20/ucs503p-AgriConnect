# AgriConnect — Frontend developer guide

Audience: anyone building or extending the Next.js app. The UI is a client of the Express API. You do not query Supabase from the browser.

Related: [API_CONTRACT.md](./API_CONTRACT.md) · [API_STATUS_CODES.md](./API_STATUS_CODES.md) · [README.md](./README.md)

---

## 1. Run the UI

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` must be `http://localhost:5001` (no trailing slash). The backend must already be running.

| Script | What it does |
|---|---|
| `npm run dev` | Next.js on port **3000** |
| `npm run build` / `npm start` | Production build |
| `npm run lint` | ESLint |

There is no frontend unit-test script in V1. Treat the API contract + manual flows as the test plan.

---

## 2. Folder map

```
frontend/src/
├── app/                      # App Router pages
│   ├── page.tsx              # Public landing (logo hero + live listings)
│   ├── login / register / forgot-password / reset-password
│   ├── marketplace/          # Public browse (no login)
│   ├── listings/[id]/        # Public listing detail (order needs buyer)
│   ├── market-prices/        # Public mandi / reference prices
│   ├── farmer/               # Farmer dashboard + listing CRUD
│   ├── buyer/                # Buyer home
│   ├── orders/               # List + [id] status actions
│   ├── notifications/
│   ├── profile/
│   ├── dashboard/            # Role redirect hub
│   └── admin/                # Users, listings moderate, logs, analytics
├── components/               # shell, listing-card, ui primitives, providers
├── features/
│   ├── auth/                 # AuthProvider, RequireAuth, GuestOnly
│   ├── i18n/                 # LocaleProvider, LanguageSwitcher (en/hi/pa)
│   ├── home/                 # Public landing listings preview
│   ├── assistant/            # Kisan chat widget
│   ├── messages/             # Order chat
│   ├── listings/             # Listing form
│   └── reviews/              # Order review UI
└── lib/
    ├── api/                  # HTTP client — keep in sync with the contract
    ├── i18n/                 # en/hi/pa dictionaries + translate()
    ├── env.ts
    ├── constants.ts
    └── format.ts             # money / qty / dates for decimal strings
```

The landing page uses the illustrated AgriConnect logo on a forest banner, a marketplace promo, and a live listings preview. Live mandi rates are on `/market-prices` (linked in the header). Marketplace, listing, and dashboard pages stay conventional UI.

**i18n:** Header language switcher sets `en` / `hi` / `pa`. Strings live in `src/lib/i18n/messages/`. Prefer `useLocale().t('nav.dashboard')` for user-facing copy. Signed-in preference syncs to `PATCH /users/me` `languagePref`. Kisan receives the same locale on `POST /assistant/query`.

**Without an account** a visitor can use: `/` (home), `/marketplace`, `/listings/:id` (view only), `/market-prices`. Sign-in is required to list, order, chat, or open dashboards.

---

## 3. How the API is called

Never `fetch` ad-hoc in a page if a wrapper already exists. Add a function in `src/lib/api/` instead.

| File | Endpoints |
|---|---|
| `client.ts` | `apiRequest`, automatic refresh on `TOKEN_EXPIRED` |
| `auth.ts` | register, login, logout, me, forgot/reset password |
| `listings.ts` | CRUD + photo upload (`FormData` field `files`) |
| `orders.ts` | create, list, get, **status change** |
| `users.ts` | profile, export, delete |
| `notifications.ts` | list, read, read-all |
| `reports.ts` | `/reports/me` |
| `messages.ts` | order chat history, send, mark read |
| `reviews.ts` | order/user reviews, submit rating |
| `assistant.ts` | Kisan query + `/assistant/status` |
| `socket.ts` | Socket.io client (`join:order`, `message:new`) |
| `admin.ts` | users, suspend, verify, moderate, analytics, logs |
| `types.ts` | Shared TS types (must match API JSON) |
| `errors.ts` | `ApiError`, `getErrorMessage` (includes Zod `fields` when present), `formatFieldErrors` |
| `notifications-events.ts` | `notifyNotificationsUpdated` / `onNotificationsUpdated` for header badge refresh |
| `token-store.ts` | In-memory access token (**not** localStorage) |

### Rules the client already enforces

- `credentials: 'include'` so the HttpOnly refresh cookie is sent.
- JSON `Content-Type` unless the body is `FormData`.
- On **401 `TOKEN_EXPIRED`**, one refresh then retry. Other 401s clear the session.
- Failures throw `ApiError(status, code, message, fields?)`.

```ts
import { createOrder } from '@/lib/api/orders';
import { ApiError, getErrorMessage } from '@/lib/api/errors';

try {
  const { data } = await createOrder({
    listingId,
    quantity: '100',
    deliveryMode: 'pickup',
  });
} catch (error) {
  if (error instanceof ApiError && error.status === 409) {
    // insufficient quantity
  }
  setError(getErrorMessage(error));
}
```

Decimals and money are **strings** (`"25.00"`, `"500.000"`). Do not `Number()` them for display without `format.ts`.

---

## 4. Auth and route guards

`AuthProvider` (`features/auth/auth-context.tsx`):

1. On load, uses memory token or `POST /auth/refresh`.
2. Then `GET /auth/me`.
3. Login/register stores `accessToken` in memory only.

Use:

- `RequireAuth` — any logged-in user
- `RequireAuth roles={['FARMER']}` — farmer pages
- `RequireAuth roles={['ADMIN']}` — admin pages
- `GuestOnly` — login/register

Wrong role → redirect to that user’s dashboard. Logged out → `/login`.

If `user.isSuspended`, mutating API calls return **403 `ACCOUNT_SUSPENDED`**. Show a blocked state; still allow `/auth/me` and logout.

---

## 5. Screens ↔ APIs (where to continue)

| User goal | Page | API |
|---|---|---|
| Register / login | `app/register`, `app/login` | `POST /auth/register`, `/login` |
| Browse crops | `app/marketplace` | `GET /listings` (public) |
| Mandi / reference prices | `app/market-prices` | `GET /market/prices`, `/market/mandi/prices` (public). Requires API on `NEXT_PUBLIC_API_BASE_URL` (default `:5001`). Empty table = no Agmarknet arrivals for that crop/state today (e.g. Haryana Wheat); try Potato/Onion. `502 MANDI_FEED_UNAVAILABLE` = feed down/rate-limited. |
| Ask Kisan | `FarmerChatWidget` | Voice-first: quiet launcher, mobile fullscreen, large mic (transcript → review → Send), waveform states, read-aloud. `POST /assistant/query` + `language`. |
| Listing detail | `app/listings/[id]` | `GET /listings/:id`, `GET /users/:id/public` |
| Create listing | `app/farmer/listings/new` | `POST /listings` (draft) → `POST .../photos` → `PATCH` `{ status: "active" }` |
| Edit listing | `app/farmer/listings/[id]/edit` | `PATCH /listings/:id`, photo add/delete |
| Place order | listing detail / buyer flow | `POST /orders` |
| **Approve / discard / change order** | `app/orders/[id]` | `PATCH /orders/:id/status` — see below |
| Notifications | `app/notifications` | `GET /notifications`, `PATCH .../read` |
| Reports | farmer/buyer dashboards | `GET /reports/me` |
| Admin moderate listing | `app/admin/listings` | `PATCH /admin/listings/:id/moderate` (`removed` = discard, `active` = approve) |
| Admin users | `app/admin/users` | suspend / verify |

### Order buttons (already implemented)

`app/orders/[id]/page.tsx` → `nextActions()`:

| Role | Current status | Button | Body |
|---|---|---|---|
| Farmer | pending | Accept order | `{ status: "accepted" }` |
| Farmer | accepted | Confirm | `{ status: "confirmed" }` |
| Farmer | confirmed | Mark fulfilled | `{ status: "fulfilled" }` |
| Farmer | pending/accepted/confirmed | Cancel | `{ status: "cancelled", cancellationReason }` |
| Buyer | pending only | Cancel order | cancelled + reason |
| Admin | pending/accepted/confirmed | Admin cancel | cancelled + reason |

Illegal clicks are still possible if the order changed under you → **400 `INVALID_REQUEST`**. Show `error.message`.

---

## 6. Status-code handling in UI

Copy this behavior whenever you add a form:

| Status | `error.code` | UI |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Per-field from `error.fields` |
| 400 | `INVALID_REQUEST` | Alert with `error.message` (wrong approve/discard/change) |
| 401 | `TOKEN_EXPIRED` | Handled in `client.ts` |
| 401 | else | Redirect login |
| 403 | `FORBIDDEN` | Hide control |
| 403 | `ACCOUNT_SUSPENDED` | Suspended message |
| 404 | `NOT_FOUND` | Not-found page |
| 409 | `CONFLICT` | Email taken or not enough stock |
| 413 / 415 | photo errors | File picker hint |
| 429 | | “Too many attempts, wait a minute” |
| 500 / 503 | | Retry later |

Full tables: [API_STATUS_CODES.md](./API_STATUS_CODES.md).

---

## 7. What the frontend must not do

- Call Supabase `/rest/v1`, Auth, or Storage with the service role.
- Store the access token in `localStorage` or cookies you control.
- Call `GET /api/v1/admin/reports.csv` (not implemented).
- Skip steps on orders (`pending` → `fulfilled`).
- Create a listing with `status: "active"` (API returns 400). Always draft → photos → activate.
- Rely on `village` in public listing cards (null unless owner/related buyer/admin).

---

## 8. Adding a new screen

1. Confirm the endpoint exists in [API_CONTRACT.md](./API_CONTRACT.md).
2. Add or extend `src/lib/api/*.ts` + `types.ts`.
3. Handle every error code listed for that endpoint.
4. Guard the page with `RequireAuth` and the correct `roles`.
5. If the backend changed the contract in the same PR, update types in the same commit.
