# Countribus

A nationwide **Nigerian intercity bus booking marketplace** with vendor-branded
portals: passengers discover and book journeys from multiple operators; each
operator manages its fleet, routes, schedules, passengers, luggage and revenue.

> **Status: Phase 0 (foundation).** Scaffold, docs, design system, permissions
> and CI are in place. Feature work begins in Phase 1 — see
> [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 ·
Supabase (Postgres, Auth, Storage, Realtime) · Paystack + Flutterwave ·
Vercel · Vitest + Playwright.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + provider keys
pnpm dev                     # http://localhost:3000
```

The app boots without Supabase configured (landing page + dashboard preview use
seeded demo data). Live data needs the env vars in `.env.example`.

## Scripts

| Command                     | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `pnpm dev`                  | Dev server                                       |
| `pnpm build` / `pnpm start` | Production build / serve                         |
| `pnpm lint`                 | ESLint                                           |
| `pnpm typecheck`            | `tsc --noEmit`                                   |
| `pnpm test`                 | Vitest unit/integration                          |
| `pnpm e2e`                  | Playwright E2E                                   |
| `pnpm format`               | Prettier                                         |
| `pnpm gen:types`            | Regenerate Supabase types (needs linked project) |

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — contributor rules & guardrails
- [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)
- [`docs/SECURITY_AND_RLS.md`](docs/SECURITY_AND_RLS.md)
- [`docs/QA_TEST_PLAN.md`](docs/QA_TEST_PLAN.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md)
- [`supabase/README.md`](supabase/README.md) — migration workflow

## Project layout

```
app/            Next.js routes ( / marketing, /dashboard admin+vendor )
components/     Shared UI (ui, dashboard, booking, fleet, operations)
features/       Domain slices (auth, vendors, fleet, routes, schedules,
                inventory, bookings, payments, luggage, notifications, reports)
lib/            supabase/, permissions/, money.ts, env.ts, auth/, db/, payments/,
                validation/, observability/
supabase/       config.toml, migrations/, seed.sql
docs/           Product + engineering specification
tests/          unit/, integration/, e2e/
```

## Non-negotiables

Server-side authorization **and** Supabase RLS on every tenant table · never
trust client-supplied price/role/vendor/payment/seat state · money is integer
kobo · bookings confirm only from verified payment webhooks · vehicle management
restricted to Super Admin and Vendor Owner/Manager. See `CLAUDE.md`.
