# Database (RLS) tests

These validate the SQL migrations and Row Level Security policies against a real
PostgreSQL instance. On Supabase they run against the linked project; locally
they run against a bare Postgres with a small harness that emulates the
Supabase-managed `auth` schema and roles (`anon`, `authenticated`,
`service_role`).

- `_local_supabase_harness.sql` — creates `auth.users`, `auth.uid()`,
  `auth.role()` and the three Supabase roles. **Local only** — do not apply to
  a real Supabase project (it already has these).
- `phase1_rls.sql` — Phase 1 tenancy suite: owner bootstrap, cross-vendor
  isolation, self-approval guard, privilege-escalation guard, admin approval +
  audit, and anonymous marketplace visibility. Prints `PASS`/`FAIL` per check.
- `phase8_passenger_types.sql` — passenger types: server-side fares (adult full,
  child 6–10 half, child 1–5 free), lap infants consume no seat, and the
  negative guards (a seated passenger can't be a 1–5 infant; the seat-type check
  constraint blocks a seated infant row).
- `phase7_dashboards_notifications.sql` — Phase 7 suite: notifications RLS
  (own-rows-only, admin-sees-all, cannot write another user's preferences),
  and metrics authz — `admin_dashboard_metrics`/`admin_revenue_by_month`
  admin-only (no leak to non-admins), `vendor_dashboard_metrics` tenant-scoped
  (owner reads own vendor, blocked cross-tenant).
- `phase9_promotions.sql` — promo codes & referrals: `promo_quote` validation
  (percent, min-fare, inactive, expired, per-code/per-customer caps, max-discount
  cap), the discount applied by `create_booking_from_hold`, referral attribution
  on signup (metadata code), the referrer reward granted on the referee's first
  paid booking and consumed on the referrer's own paid booking, and RLS negatives
  (customers can't read `promo_codes` or others' `referral_rewards`).

Each suite is **independent** and expects a FRESH database (harness + all
migrations). Do not stack suites in one database — they reuse fixed IDs and
seed data, so running several against the same DB produces false failures.

## Run locally

```bash
# with a running Postgres 15/16 (as a non-root user):
createdb countribus_test
psql -d countribus_test -f tests/db/_local_supabase_harness.sql
for f in supabase/migrations/*.sql; do psql -d countribus_test -f "$f"; done
psql -d countribus_test -f tests/db/phase1_rls.sql | grep -E 'PASS|FAIL'
```

All lines must read `PASS`. These complement the Vitest suites, which cover the
pure permission matrix and money logic without a database.
