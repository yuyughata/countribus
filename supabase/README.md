# Supabase — database & migration workflow

PostgreSQL (via Supabase) is the authoritative source for seat inventory,
payment status and the financial ledger (plan §5). **Migrations are the only
controlled path for schema changes.**

## Status

Phase 0: the migration workflow and config are scaffolded. No migrations have
been written yet — we are waiting for the Supabase connector so migrations can
be authored and validated against the live `countribus` project. The complete
target schema is specified in [`docs/DATABASE_SCHEMA.md`](../docs/DATABASE_SCHEMA.md);
translating it into numbered migrations is the first task of Phase 1–2.

## One-time setup

```bash
# Install the CLI (not bundled in this repo):
#   https://supabase.com/docs/guides/cli
pnpm dlx supabase --version

# Log in and link to the hosted project:
supabase login
supabase link --project-ref <countribus-project-ref>
```

## Everyday commands

```bash
supabase start                       # local stack (Postgres + Studio) for dev
supabase migration new <name>        # create a new timestamped migration
supabase db reset                    # re-apply all migrations + seed.sql locally
supabase db push                     # apply pending migrations to the linked project
pnpm run gen:types                   # regenerate lib/supabase/database.types.ts
```

## Rules

- Every schema change is a migration committed to Git. No manual edits in the
  dashboard that aren't captured as migrations.
- Each tenant-owned table gets `vendor_id` + an RLS policy (see
  `docs/SECURITY_AND_RLS.md`). RLS is enabled from the migration that creates
  the table — never as an afterthought.
- Money columns are `bigint` kobo + a currency column; never floating point.
- Timestamps are `timestamptz` stored in UTC.
- Ask before running destructive migrations or anything against production data.
