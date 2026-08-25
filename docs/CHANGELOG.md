# AgriConnect — Changelog

Keep this file in reverse chronological order. Flag **breaking** changes so frontend and backend teammates can migrate.

Format: `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`.

---

## Unreleased

### Added

- Developer documentation set: `docs/README.md`, `docs/API_STATUS_CODES.md`, `docs/FRONTEND_GUIDE.md`, `docs/BACKEND_GUIDE.md`, and this changelog.
- Cursor rule `.cursor/rules/update-api-docs.mdc` to keep API docs in sync with route and client changes.

---

## V1 (current implementation)

Shipped REST API under `/api/v1` covering auth, users, listings, orders, notifications, reports, and admin. See [API_CONTRACT.md](./API_CONTRACT.md) and [API_STATUS_CODES.md](./API_STATUS_CODES.md).
