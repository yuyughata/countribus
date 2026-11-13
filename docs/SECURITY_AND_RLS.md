# Security, Privacy & RLS — Countribus

Plan §13. Deny by default. Two enforcement layers that must agree: server-side
checks (`lib/permissions`) **and** Postgres RLS.

## RLS policy pattern

Every tenant-owned table:

1. `alter table <t> enable row level security;` in the creating migration.
2. Policies keyed on the caller's vendor membership and role, e.g.:

```sql
-- Helper: current user's vendor ids (security definer function)
create or replace function auth_vendor_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select vendor_id from vendor_staff
  where user_id = auth.uid() and is_active;
$$;

-- Read own-vendor rows
create policy vehicles_select_own on vehicles for select
  using (vendor_id in (select auth_vendor_ids()) or is_platform_admin());

-- Mutate only with the vehicle-management role (defence in depth; server also checks)
create policy vehicles_write_own on vehicles for all
  using (vendor_id in (select auth_vendor_ids()))
  with check (vendor_id in (select auth_vendor_ids()));
```

- `is_platform_admin()` = security-definer lookup of `profiles.is_platform_admin`.
- Passenger-owned rows (bookings, tickets) are keyed on `auth.uid()` ownership,
  never on a client-supplied id.
- The service-role client (`lib/supabase/admin.ts`) bypasses RLS and is used
  only for trusted system ops (webhooks, seeds) after in-code authorization.

## Authorization rules

- Every mutation and sensitive read runs a server-side permission check
  (`can(role, capability)`) **before** touching data. UI gating is cosmetic.
- **Vehicle management** capability is restricted to super_admin / vendor_owner /
  vendor_manager at every layer (TS matrix + RLS write policy + server action).
- Cross-vendor access and IDOR attempts must fail safely and be covered by
  negative tests.

## Payments

- Initialize transactions server-side only; persist provider reference, amount,
  currency, booking reference.
- Verify webhook signatures; store provider event ids (`webhook_events`) for
  idempotency; independently verify status/amount with provider APIs.
- Never trust client-supplied amount, vendor, commission rate or payment status.

## Data protection

- Validate all input with Zod schemas; rate-limit auth, search, booking, webhook.
- Redact sensitive data from logs; minimise PII in exports and notifications.
- Private Storage buckets only; access via short-lived signed URLs; no
  predictable public ticket/luggage paths.
- Audit logs for vendor approval, vehicle/schedule/financial changes, staff
  permissions, manual overrides.
- Minimise passenger data collection; define retention/deletion.
- Review Nigeria Data Protection Act, consumer protection, transport licensing
  and payment-provider terms with qualified local advisers before launch.

## Secrets & environments

- Server-only secrets never prefixed `NEXT_PUBLIC_`, never committed
  (`lib/env.ts` separates and validates).
- Separate dev / staging / production Supabase + Vercel; rotate secrets; backups.
