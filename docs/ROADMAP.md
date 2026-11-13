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

## Phase 5 — Booking & payments ✅ (live, end-to-end verified)

- ☑ Bookings/passengers/payments/ledger/tickets schema + RLS; applied live
- ☑ `create_booking_from_hold()` (server-priced), `confirm_payment()`
  (idempotent, amount-checked, writes ledger + tickets), `cancel_booking()`
- ☑ Paystack + Flutterwave init + webhook signature verification; webhook route
  confirms only on a verified signed event
- ☑ Checkout, My Bookings, booking detail, per-passenger QR e-tickets +
  server-generated PDF (pdf-lib), cancel/revoke
- ☑ Tests: `tests/db/phase5_bookings.sql` (15/15) + `tests/unit/payments.test.ts`
  (6); live smoke of the full search→…→paid-ticket flow (demo data removed)
- ☐ Luggage pricing in checkout (Phase 6); email/SMS/WhatsApp delivery (Phase 7)

## Phase 6 — Luggage & terminal ops ✅ (live)

- ☑ Luggage policies, per-passenger declaration + fees in checkout, QR luggage
  tags, scan events; boarding_events
- ☑ `verify_ticket()` (public) + `/verify/[token]` page; `record_boarding()`,
  `record_luggage_event()` with terminal/luggage-officer scope
- ☑ Vendor departure manifests (`/dashboard/manifests`) with passenger + luggage
  columns, boarding controls, **CSV export** (per-departure)
- ☑ Tests: `tests/db/phase6_luggage_boarding.sql` (8/8) — per-passenger luggage
  fee, ticket verify valid/invalid, boarding authz scope, manifest reconciliation
- ☑ **Seat configuration upgrade** (from the supplied reference): fixture cells
  (Driver/W-C/Entrance/Tea-Coffee/Empty), seat classes + per-seat surcharges in
  the editor; surcharge snapshots into inventory and flows into booking price
- ☐ Lockable final manifest snapshot + per-terminal shift scoping (refinements)

## Phase 7 — Dashboards & communications ✅ (live)

- ☑ Admin + vendor dashboards wired to real data: `admin_dashboard_metrics()`,
  `vendor_dashboard_metrics()`, `admin_revenue_by_month()` (SECURITY DEFINER,
  internally guarded by `is_platform_admin()` / `has_vendor_role()`); KPIs,
  revenue chart, pending-approvals + recent-activity right rail
- ☑ Tenant scoping: `dashboardMode(ctx)` routes super-admin → platform view,
  vendor roles → their own vendor metrics, everyone else → onboarding prompt
- ☑ Notifications module (`lib/notifications/`): `notifications` +
  `notification_preferences` tables (RLS: own rows or admin), templated
  booking-confirmation email, pluggable email transport
- ☑ Email-on-payment hook: the verified payment webhook queues the
  confirmation email on first `confirmed` only; best-effort (never fails the
  webhook), every attempt persisted with terminal status (sent/skipped/failed)
- ☑ Graceful no-provider mode: when `RESEND_API_KEY`/`NOTIFICATIONS_FROM_EMAIL`
  are unset, sends are recorded `skipped` for later backfill, not `failed`
- ☑ PWA baseline shipped earlier (`/manifest.webmanifest`, installable shell)
- ☐ SMS/WhatsApp channels + scheduled daily summaries + delivery retries (later)

## Phase 8 — Hardening & launch ✅ (review + runbook live; pilot gated)

- ☑ Security review (`docs/SECURITY_REVIEW.md`): trust model, two-layer authz,
  secrets handling, payment integrity; every Supabase security advisor finding
  triaged + dispositioned (deny-all RLS and guest/guarded SECURITY DEFINER
  functions are intentional)
- ☑ Performance pass: `auth_rls_initplan` advisor fixed via
  `20261113170000_perf_rls_initplan.sql` (9 policies, semantics-preserving,
  re-validated); remaining INFO/WARN findings dispositioned
- ☑ Phase 7 DB suite added with negative permission tests
  (`tests/db/phase7_dashboards_notifications.sql`, 12/12); all 7 suites green on
  fresh DBs (70 checks total)
- ☑ Operations runbook (`docs/RUNBOOK.md`): deploy, backup/restore drill,
  monitoring signals, incident response, launch checklist, a11y/perf baseline,
  pilot plan
- ☐ Launch-config residuals (provider prod keys, email provider, auth
  leaked-password protection, PITR/restore drill, provider verify-GET) — owned
  by cutover, tracked in `SECURITY_REVIEW §6` / `RUNBOOK §6`
- ☐ Pilot with vetted vendors + limited routes; load-test seat contention

**Immediate next task:** Phase 8 — security review (document the expected
SECURITY DEFINER / deny-all-RLS lints), performance, accessibility pass,
backup/restore + monitoring runbook, then pilot.
