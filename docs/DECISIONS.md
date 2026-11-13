# Decisions Log — Countribus

Architecture Decision Record. Append new entries; don't rewrite history.

## Confirmed

- **ADR-0001 Stack** — Next.js 16 (App Router) + React 19 + TypeScript strict,
  Tailwind v4, Supabase (Postgres + Auth + Storage + Realtime), Vercel hosting.
  _Rationale: matches plan §5; modular monolith to start._
- **ADR-0002 Money** — integer kobo (`bigint`) + currency everywhere; commission
  as basis points. No floating point. (`lib/money.ts`.)
- **ADR-0003 Permissions** — single TS matrix (`lib/permissions/roles.ts`)
  mirrored by RLS; vehicle management restricted to super_admin / vendor_owner /
  vendor_manager. Enforced + tested.
- **ADR-0004 Package manager** — pnpm.
- **ADR-0005 Design tokens** — recreated from the supplied Treepz dashboard
  reference (vibrant muted-orange primary, cream sidebar, peach active state,
  pastel charts). Tokens centralised in `app/globals.css`; the brand/logo/
  content are NOT copied. Reference saved at `docs/assets/dashboard-reference.jpg`.
- **ADR-0006 Seat-hold default** — 10 minutes (plan planning assumption; revisit
  before production — see below).

## To confirm before production (plan §16)

1. **Commission basis** — base fare only, or fare + selected fees; treatment of
   discounts and refunds.
2. **Settlement** — vendor payout cadence, minimum threshold, reserve/holdback,
   reconciliation.
3. **Cancellation/refund** — no-show, reschedule, partial passenger cancellation.
4. **Seat-hold duration** — confirm 10 min; whether it can be extended.
5. **Luggage policy** — free allowance, excess charges, prohibited items,
   liability/claims per vendor.
6. **Passenger identity** — required fields and any route/operator-specific rules.
7. **Vendor payment account** — own provider account vs. all payments through the
   platform initially.
8. **Vendor approval** — evidence required, operational verification,
   suspension/reactivation workflow.

## Open technical questions

- Seat-hold expiry: scheduled job (pg_cron / external) vs. lazy reconciliation
  on read — likely both. Decide in Phase 4.
- Vehicle no-overlap: Postgres exclusion constraint vs. transactional check.
  Prefer exclusion constraint if `btree_gist` is available on the project.

## Environment / tooling notes

- Supabase connector timed out at session start, then reconnected after a
  worker restart. The hosted **`countribus`** project (ref
  `nchgcofgwhvukuwynfnp`, Postgres 17, eu-west-1) is now **linked**, and all
  four Phase 1 migrations have been **applied live** via the Supabase MCP
  (`list_migrations` confirms them). `database.types.ts` is generated from the
  live schema. The second ID the owner supplied (`vdggexjlaohjlcqadbgr`) matched
  no project on the account and was discarded — the ref was confirmed by project
  name via `list_projects`.
- **Security advisors** after migrating: `search_path` and the _anon_
  can-execute lints are cleared. One WARN remains —
  `authenticated_security_definer_function_executable` for the four RLS helpers
  (`is_platform_admin`, `current_vendor_ids`, `has_vendor_role`,
  `is_vendor_creator`). `authenticated` must hold `EXECUTE` for these or the RLS
  policies that call them fail (verified empirically), and they only ever return
  the _caller's own_ authorization status. Accepted residual; a later option is
  to move them to a non-exposed (`private`) schema to clear it entirely.
- Earlier blocker (now moot): the container's HTTPS proxy blocks direct Supabase
  hosts and raw Postgres ports, so `supabase db push` / `psql` can't reach the
  project from here — the MCP tools are the connection path in this session.
- **ADR-0007 RLS guard functions** — triggers that must detect the _caller's_
  role (`service_role` vs `authenticated`) are `SECURITY INVOKER`; helpers that
  must read rows RLS would hide (vendor ownership during owner bootstrap) are
  `SECURITY DEFINER` (`is_vendor_creator`, `current_vendor_ids`, `has_vendor_role`,
  `is_platform_admin`). Mixing these up caused the first local test run to fail —
  fixed and re-validated.
- Next.js 16 uses the `proxy.ts` convention (formerly `middleware.ts`).
