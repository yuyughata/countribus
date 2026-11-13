# Implementation Roadmap & Backlog — Countribus

Phased plan (plan §11) broken into small, testable tasks. Build and validate the
domain/data foundations before polishing charts. Use seeded demo data for UI,
clearly separated from production.

Legend: ☑ done · ☐ todo

## Phase 0 — Discovery & foundation (THIS PHASE)

- ☑ Repo audit + requirements/architecture/schema/API/security/QA docs
- ☑ Next.js + TS strict + Tailwind v4 design tokens (from reference screenshot)
- ☑ Repo structure (features/lib/components/supabase/tests)
- ☑ Supabase client layer (browser/server/admin/proxy) + env validation
- ☑ Permissions matrix + money lib + unit tests
- ☑ Landing page + dashboard shell (seeded demo data)
- ☑ CI (lint/typecheck/test/build + e2e) and migration workflow scaffold
- ☐ Link hosted `countribus` project; generate DB types _(blocked on connector)_

**Exit:** app boots; lint/typecheck/CI pass; secrets separated; docs committed. ✅
(DB link pending connector.)

## Phase 1 — Identity & tenancy (IN PROGRESS)

- ☑ Migrations: `profiles`, `vendors`, `vendor_staff`, `audit_logs` + RLS,
  helper functions and guard triggers — **validated against real Postgres**
  (`tests/db/phase1_rls.sql`, 12 assertions incl. cross-vendor isolation,
  self-approval + privilege-escalation guards, admin approval + audit)
- ☑ Profile bootstrap trigger (`handle_new_user`) + platform-admin guard
- ☑ Supabase Auth server actions: register / login / logout (+ validation)
- ☑ Vendor onboarding (application → owner bootstrap) + admin decide + add staff
  server actions, with `can()`-based server authz over RLS
- ☑ Auth UI (`/login`, `/register`) + access-resolution unit tests
- ☑ Applied all 4 migrations to the live `countribus` project (ref
  `nchgcofgwhvukuwynfnp`); `database.types.ts` generated from the live schema;
  security advisors reviewed (search_path + anon lints cleared)
- ☐ Live auth smoke (needs app env wired to the project + host allowlisted) and
  DB integration tests run against the project
- ☐ Vendor onboarding + approval dashboard screens (wire actions to UI)

**Exit:** cross-vendor access tests fail safely; role matrix enforced server-side + RLS.
Schema + RLS live and verified; remaining items are app wiring + screens.

## Phase 2 — Locations & fleet

- ☐ Seed 36 states + FCT, cities, terminals, aliases; terminal search
- ☐ `vehicle_categories`, `vehicles`, `seat_templates`, `seat_template_seats` migrations + RLS
- ☐ Seat-layout editor (rows/cols, seat types, sellable flags) + versioning
- ☐ Vehicle CRUD restricted to super_admin / vendor_owner / vendor_manager
- ☐ Tests: only permitted roles manage vehicles; template versioning; layout validation

## Phase 3 — Routes & schedules

- ☐ Routes + stops; direct schedules with fare, vehicle assignment, cut-off
- ☐ Publish flow: snapshot seat-layout version; generate `schedule_seats`
- ☐ Vehicle no-overlap / turnaround constraint
- ☐ Tests: published schedule has stable vehicle/layout snapshot + valid inventory

## Phase 4 — Search & seat inventory

- ☐ Journey search API (origin/destination/date/pax/category), P95 < 2s
- ☐ Seat map UI with states (available/booked/held/selected/blocked)
- ☐ 10-minute holds, expiry job + lazy reconciliation, atomic allocation
- ☐ Concurrency tests: no duplicate allocation; expired holds release safely

## Phase 5 — Booking & payments

- ☐ Passenger details + per-passenger luggage declaration + server-side pricing
- ☐ Booking state machine; Paystack + Flutterwave behind a provider interface
- ☐ Signed, idempotent webhooks; verified-payment confirmation; commission ledger
- ☐ Server-generated PDF tickets (per passenger) + QR verify + email delivery
- ☐ "My Bookings / Tickets" customer area; resend; revoke on cancel/refund
- ☐ Tests: only verified payment confirms; duplicate webhooks don't double-post

## Phase 6 — Luggage & terminal ops

- ☐ Luggage fees/limits/prohibited policy; QR luggage tags; scan events
- ☐ Boarding: ticket QR verify, check-in/boarded; passenger/luggage manifests (PDF/CSV)
- ☐ Vendor departure-manifest area (per schedule) + lockable snapshot + audit
- ☐ Terminal-scoped access; read-only offline manifest download
- ☐ Tests: manifest reconciles with bookings; staff scope enforced; per-date separation

## Phase 7 — Dashboards & communications

- ☐ Admin + vendor dashboards (KPIs, analytics, right rail) with real charts
- ☐ Date-range filters drive all metrics; vendor data scoped to tenant
- ☐ Email/SMS/WhatsApp notifications + daily summaries; delivery logs + retries
- ☐ PWA polish (offline shell, install)

## Phase 8 — Hardening & launch

- ☐ Security review, performance, accessibility pass
- ☐ Backup/restore, monitoring, incident runbook; UAT; provider production checks
- ☐ Pilot with vetted vendors + limited routes; load-test seat contention

**Immediate next task:** once the Supabase connector is restored, link the
`countribus` project, then author Phase 1 migrations from `DATABASE_SCHEMA.md`.
