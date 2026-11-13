# Project rules for Claude Code — Countribus

Countribus is a nationwide Nigerian intercity bus booking marketplace with
vendor-branded portals. This file is the operating contract for any AI or human
contributor. The authoritative specification lives in [`docs/`](./docs).

## Before implementing

- Read [`docs/PRODUCT_REQUIREMENTS.md`](./docs/PRODUCT_REQUIREMENTS.md) and
  [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) first.
- Work only on the requested phase/task; do not silently expand scope.
- Inspect the repository and the current `git diff` before editing.

## Non-negotiable rules

- **TypeScript strict mode**, shared components and domain-service boundaries.
- Never put secrets in source, prompts, logs or committed files.
- **Never trust client-supplied** price, role, `vendor_id`, payment status or
  seat availability. Recompute/verify on the server.
- Enforce authorization **on the server AND with Supabase RLS**. Hiding a button
  is not authorization.
- **Vehicle management (create/edit/deactivate/seat-template config/assignment)
  is restricted to Super Admin and Vendor Owner/Manager.** Terminal staff and
  passengers must NEVER receive it. Terminal staff may _view_ assigned vehicle
  details only. This is encoded and tested in `lib/permissions/roles.ts` and
  `tests/unit/permissions.test.ts` — keep both in sync.
- All schema changes require SQL migrations in `supabase/migrations` plus
  appropriate RLS policies. Migrations are the only path for schema change.
- Money is integer **kobo** (`bigint`) + explicit currency — never floats
  (`lib/money.ts`). Times are `timestamptz` in UTC.
- A booking only becomes paid from a **verified provider webhook/response**,
  never a browser redirect. Webhook processing is idempotent.
- Add/update tests for every behaviour change, including **negative permission
  tests** (cross-vendor IDOR, direct API attempts).

## Definition of done (plan §17)

A feature is done only when: acceptance criteria met; server-side authz +
tenant isolation tested; migrations/constraints addressed; loading/empty/
success/validation/failure/permission-denied states implemented; tests cover
normal/edge/abuse/failure; responsive + a11y checked; audit/logging present for
sensitive actions; docs + `.env.example` updated; lint/typecheck/tests/build
pass. Do not claim done if any check fails — report failures and blockers.

## Commands

```bash
pnpm dev            # start dev server
pnpm build          # production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest unit/integration
pnpm e2e            # playwright end-to-end
pnpm format         # prettier --write
pnpm gen:types      # regenerate Supabase types (needs linked project)
```

Run lint, typecheck, unit/integration tests and relevant E2E before reporting a
task complete.

## Guardrails

- Ask before destructive migrations, production data changes, or live payment
  actions.
- Keep `docs/` and `.env.example` updated when configuration or architecture
  changes. Record decisions in `docs/DECISIONS.md`.

## Repository map

- `app/` — Next.js App Router routes (`/` marketing, `/dashboard` admin/vendor).
- `components/` — shared UI (`ui/`, `dashboard/`, `booking/`, `fleet/`, `operations/`).
- `features/` — domain feature slices (auth, vendors, fleet, routes, schedules,
  inventory, bookings, payments, luggage, notifications, reports).
- `lib/` — cross-cutting libs (`supabase/`, `permissions/`, `money.ts`, `env.ts`,
  `auth/`, `db/`, `payments/`, `validation/`, `observability/`).
- `supabase/` — `config.toml`, `migrations/`, `seed.sql`.
- `docs/` — product, architecture, schema, API, security/RLS, QA, decisions.
- `tests/` — `unit/`, `integration/`, `e2e/`.
