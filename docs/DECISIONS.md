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
- **ADR-0008 Cache Components off** — `next.config.ts` sets
  `cacheComponents: false`. The authenticated dashboard reads auth cookies and
  is per-user dynamic, so Next 16's static-first Cache Components model only adds
  friction (prerender errors) with no benefit there; static routes (`/`, auth
  pages) still prerender.
- **Live verification done this session**: added `nchgcofgwhvukuwynfnp.supabase.co`
  to the environment allowlist, wired `.env.local` (public URL + anon key;
  gitignored), and ran the app with `NODE_USE_ENV_PROXY=1` (the container's
  Node needs the proxy for `fetch`). Logged in as a seeded admin and exercised
  the onboarding + approval screens end-to-end against the live project; demo
  rows were removed afterward. GoTrue signups from here hit the project's email
  rate limit / domain policy — a project auth-settings matter, not app code.
- **ADR-0007 RLS guard functions** — triggers that must detect the _caller's_
  role (`service_role` vs `authenticated`) are `SECURITY INVOKER`; helpers that
  must read rows RLS would hide (vendor ownership during owner bootstrap) are
  `SECURITY DEFINER` (`is_vendor_creator`, `current_vendor_ids`, `has_vendor_role`,
  `is_platform_admin`). Mixing these up caused the first local test run to fail —
  fixed and re-validated.
- Next.js 16 uses the `proxy.ts` convention (formerly `middleware.ts`).

## Phase 7 — Dashboards & communications

- **ADR-0009 Metrics via guarded SECURITY DEFINER RPCs** — dashboard figures
  come from `admin_dashboard_metrics()`, `vendor_dashboard_metrics(vendor)` and
  `admin_revenue_by_month()`. They are `SECURITY DEFINER` so they can aggregate
  across the financial ledger and bookings without granting the caller direct
  read on those rows, but each one re-checks `is_platform_admin()` /
  `has_vendor_role(vendor, …)` on entry and raises/returns empty otherwise.
  Tenant isolation and admin-only access are proven in
  `tests/db/phase7_dashboards_notifications.sql`.
- **ADR-0010 Notifications are best-effort, never on the payment path** — the
  payment webhook confirms the booking first, then queues the confirmation
  email in a try/catch that cannot fail the webhook (the money is already
  recorded). Every attempt is persisted to `public.notifications` with a
  terminal status (`sent`/`skipped`/`failed`). When no email provider is
  configured the send is recorded `skipped`, not `failed`, so unprovisioned
  environments stay green and ops can backfill. Email transport is pluggable
  (`lib/notifications/email.ts`, Resend by default) and credentials are
  server-only env (`RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`).

## Phase 8 — Hardening & launch

- **ADR-0011 Expected Supabase advisor lints are documented, not "fixed"** —
  `docs/SECURITY_REVIEW.md` records which linter findings are intentional:
  (a) `rls_enabled_no_policy` on `payment_transactions`, `webhook_events`,
  `ticket_delivery_events` is the desired deny-all posture (service-role only);
  (b) `anon/authenticated_security_definer_function_executable` covers the guest
  booking RPCs (designed for anon) and the internally-guarded metrics/helpers;
  (c) `extension_in_public` for `btree_gist` is accepted — it backs the
  vehicle-overlap exclusion constraint and relocating a shipped extension is
  riskier than the cosmetic benefit. Residual, provider-side items (leaked-
  password protection, auth rate limits) are tracked as launch config, not code.

## Post-launch change request (ticket, boarding details, channels, brand)

- **ADR-0012 Boarding details on the schedule** — a boarding street address and
  a passenger contact phone are captured when a departure is added
  (`schedules.boarding_address`, `schedules.boarding_contact_phone`;
  migration `20261113180000`). They print on the ticket and are sent in every
  confirmation, falling back to the origin terminal address / vendor phone.
- **ADR-0013 Ticket redesign** — the PDF e-ticket is a premium navy/gold layout
  carrying operator (vendor) name, boarding address, contact number, ticket ID
  (booking reference), QR, and a "Powered by Countribus" footer.
  - **Bug fixed:** pdf-lib's standard fonts are WinAnsi and cannot encode `₦`
    (U+20A6) or `→` (U+2192); the fare line crashed ticket generation. PDFs now
    use `formatKoboAscii` ("NGN 25,000"), a drawn gold chevron, and a `safe()`
    sanitizer that strips any non-WinAnsi code point from dynamic text.
- **ADR-0014 Three-channel confirmations** — booking confirmations go out by
  email (Resend), SMS (Twilio) and WhatsApp (Meta Cloud API). SMS/WhatsApp carry
  ticket ID, boarding address and contact number. Every channel degrades to a
  recorded `skipped` when unconfigured; all attempts persist in
  `public.notifications`.
- **ADR-0015 Seat classes removed** — Comfort/Panorama classes and per-seat
  surcharges were removed from the seat-layout editor; seats are standard-only.
  The surcharge columns remain in the schema (default 0) so inventory/booking
  code is unaffected.
- **ADR-0016 Premium brand system** — new design language: midnight-navy ink +
  brushed-gold accent over warm ivory, Plus Jakarta Sans (UI) + Fraunces
  (display) type, a Countribus logo/mark component, refined buttons/cards, and a
  redesigned marketing surface (landing, auth, search, booking funnel, ticket).

## Passenger types & Paystack copy

- **ADR-0017 Passenger types with server-side fares** — new `passenger_type`
  enum (adult, child_1_5, child_6_10). Pricing is computed in
  `create_booking_from_hold`, never trusted from the client:
  adult = full fare, child 6–10 = half (seated), child 1–5 = **free, lap, no
  seat**. Lap infants are `booking_passengers` rows with a NULL seat (columns
  made nullable; a check constraint enforces "infant ⇔ no seat"), so they appear
  on manifests and get a ticket but consume no inventory. Seat holds still equal
  the number of seated passengers. Covered by
  `tests/db/phase8_passenger_types.sql` (fares + negative guards).
- **ADR-0018 Customer-facing payment copy** — replaced the "webhook-verified"
  wording with "Pay securely with Paystack" on the landing page and checkout
  CTA (the CTA reflects the chosen provider). The webhook-verification mechanism
  is unchanged; only the customer-facing language is friendlier.

## Role-aware menus + completed dashboard pages

- **ADR-0019 Capability-driven dashboard nav** — each dashboard route maps to a
  required capability (`lib/permissions/dashboard-nav.ts`). The layout computes
  the allowed hrefs from the auth context and passes them to the sidebar and the
  mobile drawer, which filter the menu. Every nav item now points to a real page,
  and each page re-checks the capability server-side
  (`requireDashboardCapability`, redirecting unauthorized access to /dashboard) —
  the hidden menu item is never the only guard. Verified by logging in as every
  demo role: Super Admin 13 items, Vendor Owner 10, Vendor Manager 7, Booking
  Officer 3, Terminal Staff 3, Passenger 2 — all visible items load (no 404s).
- Built the previously-missing pages: routes, finance, reports, security,
  activity, permissions, settings, profile. `vendor_staff_list` (SECURITY
  DEFINER, guarded) lets an owner/manager see their team roster with names,
  which profiles RLS would otherwise hide.

## Admin-settable platform commission

- **ADR-0020 Commission set by admin under Settings** — the marketplace
  commission percentage is configured by a platform admin at
  /dashboard/settings. `set_platform_commission(p_bps)` (SECURITY DEFINER,
  admin-only, audited) closes the current open platform rule and appends a new
  `commission_rules` row; `confirm_payment` already reads the newest platform
  rule, so new paid bookings use the new rate while existing bookings are
  unchanged. The UI shows the live rate (read-only for operators). Verified
  end-to-end against the live project. Percentage → basis points (12.5% = 1250).

## Delete vehicle/route + realistic seat map

- **ADR-0021 Delete vehicle & route** — owner/manager/admin can delete a vehicle
  or a route from the dashboard (`deleteVehicle`, `deleteRoute`; capability-
  checked, RLS `for all`). Vehicle seat templates cascade; a vehicle/route still
  referenced by schedules is blocked by the FK (restrict) and the action returns
  a clear "in use" message instead of a raw error.
- **ADR-0022 Bus-arrangement seat map** — the booking seat map renders seats at
  their real row/column (column derived from the seat label letter) with a
  centre aisle for 3+-across layouts, a FRONT/driver/door header, and a seat-icon
  glyph per seat coloured by state. No schema change: column position is encoded
  in the existing seat labels. A sample 2+2 coach departure was seeded for the
  demo operator so the flow is bookable.
