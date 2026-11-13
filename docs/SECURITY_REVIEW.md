# Security Review — Countribus (Phase 8)

Date: 2026-11-13 · Scope: full platform (Phases 0–7), live project
`nchgcofgwhvukuwynfnp`. This review is evidence-backed: every control below is
exercised by an automated test (`tests/db/*.sql`, `tests/unit/*`) or verified
live via the Supabase advisors.

## 1. Trust model

- **Clients are never trusted** for price, role, `vendor_id`, payment status or
  seat availability. The server recomputes fares (`lib/money.ts`,
  `create_booking_from_hold`), derives roles from `vendor_staff` /
  `profiles.is_platform_admin`, and confirms payment only from a verified
  provider webhook with an independent amount re-check (`confirm_payment`).
- **Two enforcement layers**: application authorization (`lib/permissions`,
  `lib/auth/access.ts`) AND PostgreSQL Row Level Security. Hiding a button is
  never the control; every tenant table has RLS and is tested for cross-vendor
  IDOR.
- **Three database roles**: `anon` (guest booking surface), `authenticated`
  (signed-in users, still RLS-bound), `service_role` (server-only, bypasses RLS;
  used only in route handlers / admin client, never shipped to the browser).

## 2. Authentication & secrets

- Supabase Auth (GoTrue) issues JWTs; `proxy.ts` refreshes sessions.
- `SUPABASE_SERVICE_ROLE_KEY` and all payment/email secrets are server-only env,
  validated in `lib/env.ts`, never prefixed `NEXT_PUBLIC_`, never committed
  (`.env.example` holds blanks only). `serverEnv()` throws if imported into a
  browser bundle.
- No secret is logged, echoed, or written to committed files.

## 3. Tenant isolation & authorization (tested)

| Control | Test |
| --- | --- |
| Owner sees only their vendor; cross-vendor reads blocked | `phase1_rls.sql` |
| Self-approval + privilege-escalation guards | `phase1_rls.sql` |
| Vehicle management limited to Super Admin + Vendor Owner/Manager; terminal staff view-only; passengers denied | `phase2_rls.sql`, `tests/unit/permissions.test.ts` |
| Published seat templates frozen | `phase2_rls.sql` |
| Schedule publish authz; vehicle no-overlap exclusion | `phase3_rls.sql` |
| Concurrency-safe seat holds (parallel race) + expiry reconcile | `phase4_concurrency.sql` |
| Payment amount-mismatch rejected; confirm only on verified event; idempotent webhook; append-only ledger; no duplicate ledger/tickets | `phase5_bookings.sql` |
| Per-passenger luggage fees; ticket verify; boarding authz scope | `phase6_luggage_boarding.sql` |
| Notifications own-rows-only / admin-all; preferences not writable for others; metrics admin-only + tenant-scoped | `phase7_dashboards_notifications.sql` |

## 4. Payments

- Webhook signatures verified before any state change: Paystack HMAC-SHA512,
  Flutterwave verif-hash (`lib/payments/providers.ts`).
- `confirm_payment` is idempotent on `(provider, provider_event_id)`,
  re-checks the amount against the server-side `grand_total_kobo`, writes the
  append-only `financial_ledger` (gross / −commission / net), and generates
  tickets — all in one transaction. A browser redirect never confirms a booking.
- Money is integer kobo (`bigint`) end to end; no floats.

## 5. Supabase advisor findings — disposition

Run: Supabase security advisors, 2026-11-13. No findings require code changes;
each is an intentional design choice recorded here (and in ADR-0011).

- **`rls_enabled_no_policy` (INFO)** — `payment_transactions`, `webhook_events`,
  `ticket_delivery_events`. **Intentional deny-all.** RLS on + no policy means
  `anon`/`authenticated` can read/write nothing; only `service_role` (server)
  touches these. This is the desired posture for payment/audit internals.
- **`anon_security_definer_function_executable` (WARN)** — the guest booking
  RPCs: `search_journeys`, `schedule_public`, `hold_seats`, `release_hold`,
  `reconcile_expired_holds`, `create_booking_from_hold`, `declare_luggage`,
  `verify_ticket`. **Intentional.** These power the unauthenticated booking
  funnel and each performs its own validation; they expose only what a guest
  must see/do.
- **`authenticated_security_definer_function_executable` (WARN)** — metrics
  functions and RLS helpers. **Intentional and guarded.**
  `admin_dashboard_metrics`/`admin_revenue_by_month` require
  `is_platform_admin()`; `vendor_dashboard_metrics` requires a matching vendor
  role; helpers (`is_platform_admin`, `has_vendor_role`, …) only ever return a
  boolean/id set about the current caller. Proven non-leaking in
  `phase7_dashboards_notifications.sql`.
- **`extension_in_public` (WARN)** — `btree_gist`. **Accepted.** It backs the
  `service_window` exclusion constraint preventing double-booked vehicles.
  Relocating a live extension risks the constraint; the benefit is cosmetic.

## 5a. Performance advisor findings — disposition

Run: Supabase performance advisors, 2026-11-13.

- **`auth_rls_initplan` (WARN) — FIXED.** Migration
  `20261113170000_perf_rls_initplan.sql` wraps argument-free `auth.uid()` /
  `is_platform_admin()` calls in 9 policies as scalar subselects so they
  evaluate once per query instead of per row. Semantics-preserving; all 70
  `tests/db` checks still pass. The finding no longer appears.
- **`unindexed_foreign_keys` (INFO) — deferred, evidence-driven.** Most flagged
  FKs are on write-light / audit tables; the hot read paths already query
  indexed columns (`notifications_user_idx`, `schedules_search_idx`, per-vendor
  indexes). Blanket-indexing 27 FKs adds write cost for no proven benefit at
  zero traffic. Add covering indexes during the pilot driven by real
  slow-query logs (`RUNBOOK §4`).
- **`unused_index` (INFO) — expected.** No production traffic yet, so nothing
  has registered index hits. Re-evaluate after the pilot; keep search/tenant
  indexes regardless.
- **`multiple_permissive_policies` (WARN) — accepted.** Several tables carry a
  broad `*_select` plus a narrower `*_manage`/`*_write` policy for
  `authenticated`. Merging them is a micro-optimization that risks changing
  carefully tested access semantics; the per-query overhead is negligible at
  our scale. Left as-is deliberately.

## 6. Residual items (launch config, not code)

Track and clear during the pilot cutover (see `docs/RUNBOOK.md`):

1. Enable Supabase Auth **leaked-password protection** and tighten auth rate
   limits (project Auth settings).
2. Provision production **payment** keys/webhook secrets and the **email**
   provider (`RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`) as environment
   secrets — never in the repo.
3. Add the **independent provider verify GET** before confirming, as defence in
   depth on top of the signed webhook (TODO in the webhook handler).
4. Review Postgres **backup/PITR** retention and run a restore drill.

## 7. Sign-off checklist

- [x] RLS on every tenant table, with cross-tenant IDOR tests
- [x] Server-side authz mirrors RLS; permission matrix unit-tested
- [x] Secrets server-only, validated, uncommitted
- [x] Payments: signature + amount + idempotency verified
- [x] Money integer-kobo throughout; append-only ledger
- [x] Advisor findings triaged and dispositioned
- [ ] Residual launch-config items (§6) — owned by cutover
