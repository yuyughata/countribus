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
- ☑ Live end-to-end smoke against the project: logged in through the real app,
  RLS-scoped admin view, clicked **Approve** → server action + guard + audit
  trigger all fired (verified in DB), then demo data removed. Also ran the full
  tenant-isolation suite live in a rolled-back transaction (6/6).
- ☑ Vendor onboarding (`/dashboard/vendors/new`) + admin approval/list
  (`/dashboard/vendors`) screens wired to the actions; dashboard gated by auth;
  logout wired.

**Exit:** ✅ cross-vendor access fails safely; role matrix enforced server-side

- RLS; onboarding→approval flow works end-to-end against the live project.

## Phase 2 — Locations & fleet ✅ (live)

- ☑ Seeded 36 states + FCT, 15 major cities + terminals, aliases table + RLS
- ☑ `vehicle_categories` (seeded), `vehicles`, `seat_templates`,
  `seat_template_seats` + RLS; applied live
- ☑ Seat-layout editor (grid, seat types, sellable, publish-freeze) + versioning
- ☑ Vehicle + seat-template management restricted to super_admin /
  vendor_owner / vendor_manager (RLS + server `can()`)
- ☑ Tests: `tests/db/phase2_rls.sql` (9/9) — owner/manager can manage, booking
  officer & terminal staff cannot, cross-vendor blocked, published template
  frozen, anon reads reference data

## Phase 3 — Routes & schedules ✅ (live)

- ☑ Routes (+ route_stops), schedules with fare/vehicle/cut-off; applied live
- ☑ `publish_schedule()` RPC: authorize → snapshot seat-layout version →
  generate `schedule_seats` inventory, atomically
- ☑ Vehicle no-overlap via a GiST exclusion constraint on (vehicle, window)
- ☑ Seat-allocation partial unique index (a seat booked/held at most once)
- ☑ Tests: `tests/db/phase3_rls.sql` (7/7) — publish authz, snapshot+capacity,
  inventory generated, overlap rejected, anon sees published schedule + seat map
- ☑ App: routes/schedules console (create route, create + publish/cancel
  schedule), server actions + RLS

## Phase 4 — Search & seat inventory ✅ (live)

- ☑ `search_journeys()` SQL function (origin/dest/date/pax/category), indexed
- ☑ Seat map UI with all five states; select → `hold_seats()` (10-min)
- ☑ Atomic holds, lazy `reconcile_expired_holds()`, `release_hold()`
- ☑ **True concurrency proven**: 5 parallel two-connection races for one seat →
  exactly one winner each (never a double allocation). Plus sequential suite
  `tests/db/phase4_concurrency.sql` (7/7): hold, double-hold rejected, release,
  expiry reconcile, search.
- ☑ App: `/search` (form + results), `/book/[id]` (seat map + hold)

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
