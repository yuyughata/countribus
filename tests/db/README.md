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
