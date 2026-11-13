# Architecture — Countribus

## Stack (plan §5)

| Layer     | Choice                                          | Notes                                                      |
| --------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Frontend  | Next.js 16 (App Router) + React 19 + TypeScript | Server Components where useful; responsive PWA             |
| Styling   | Tailwind CSS v4 + design tokens                 | Tokens centralised in `app/globals.css`                    |
| Backend   | Next.js server actions / route handlers         | Modular monolith; no business logic in the browser         |
| Database  | Supabase PostgreSQL                             | Migrations in Git; constraints, indexes, RLS, transactions |
| Identity  | Supabase Auth                                   | Profiles, vendor membership, roles, secure sessions        |
| Realtime  | Supabase Realtime                               | Seat availability / ops updates; DB is source of truth     |
| Files     | Supabase Storage                                | Private buckets + signed URLs                              |
| Payments  | Paystack + Flutterwave                          | Server-side init, signature verify, idempotent webhooks    |
| Messaging | WhatsApp / SMS / email                          | Consent, templates, delivery logs, retries                 |
| Hosting   | Vercel                                          | Preview deploys, env separation                            |
| Quality   | Vitest, Playwright, ESLint, tsc                 | Unit, integration, E2E, concurrency, security              |

## Principles

- **Modular monolith** with clear domain boundaries: identity, vendors, fleet,
  routes, schedules, inventory, bookings, payments, luggage, notifications,
  reporting. Each lives under `features/<domain>` with a thin UI layer over
  domain services.
- **PostgreSQL is authoritative** for seat inventory, payment status and the
  financial ledger. Realtime is a projection, never the source of truth.
- **Money** is integer minor units (kobo) + explicit currency (`lib/money.ts`).
  No floating point for money, ever.
- **Time** is stored as `timestamptz` (UTC); displayed in Nigerian local context.
- **Every write** validates identity, role, vendor scope, state transition and
  business constraints **on the server**.
- **Migrations** are the only controlled path for schema change.

## Layering

```
UI (Server/Client Components)
  → Server Actions / Route Handlers  (authn + authz + input validation)
    → Domain services (features/*/server, lib/*)   (business rules, state machines)
      → Data access (lib/supabase/*)               (RLS-enforced queries / admin for system ops)
        → PostgreSQL (constraints, triggers, RLS)  (final invariants)
```

Authorization is enforced at **two** layers that must agree: server-side checks
(`lib/permissions`) and database RLS (`docs/SECURITY_AND_RLS.md`). The
service-role client (`lib/supabase/admin.ts`) bypasses RLS and is reserved for
trusted system operations (e.g. webhook processing) after in-code authz.

## Supabase clients

| File                         | Use                                            | RLS                     |
| ---------------------------- | ---------------------------------------------- | ----------------------- |
| `lib/supabase/client.ts`     | Client Components (browser), anon key          | enforced                |
| `lib/supabase/server.ts`     | Server Components / Actions / Route Handlers   | enforced (user session) |
| `lib/supabase/admin.ts`      | Trusted server system ops only (`server-only`) | **bypassed**            |
| `lib/supabase/middleware.ts` | Session refresh, used by `proxy.ts`            | n/a                     |

## Key invariants (plan §6)

- A seat is sold at most once per schedule — DB unique constraint on active
  `(schedule_id, seat_id)` allocations.
- Seat holds expire automatically; hold→booking conversion is atomic and
  concurrency-safe (DB transaction + row locks / conditional updates).
- A schedule snapshots the exact seat-layout version used to generate inventory;
  later template edits never rewrite published schedules.
- A vehicle cannot be assigned to overlapping trips or impossible turnarounds.
- A booking becomes paid only from a verified provider webhook/response.
- Webhook processing is idempotent (provider event/reference uniqueness).
- Vendor-owned rows carry `vendor_id`, protected by RLS + server authz.
- The financial ledger is append-only; corrections are compensating entries.

## Environments

Separate dev / staging / production Supabase + Vercel projects; rotate secrets;
enable backups. Public config via `NEXT_PUBLIC_*`; all secrets server-only
(`lib/env.ts` validates and separates them).
