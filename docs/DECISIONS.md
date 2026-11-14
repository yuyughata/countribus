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

## Wine primary rebrand

- **ADR-0023 Wine primary** — the brand primary moved from amber to wine
  (`--color-primary: #8c2743`) and the dark brand surface from navy to deep wine
  (`--color-brand-ink: #3d1020`), keeping brushed gold as the accent (wine + gold
  - cream). All surfaces consume tokens, so the swap propagated; the few
    hardcoded values (button/seat shadows, hero sky gradient, PWA theme colors,
    the ticket PDF ink + QR colour) were updated to match. Buttons are now pill
    (`rounded-full`) with a wine shadow and a subtle hover lift, for a modern
    rental-marketplace feel. (The rentallafrica.com reference could not be loaded
    from the session — its host isn't in the allowed network — so the button feel
    was interpreted from the brief.)

## Logo + app-wide UI consistency

- **ADR-0024 Wordmark logo** — the pin-icon mark was dropped; the logo is now
  the "countribus" wordmark in bold sans (matching the supplied reference), with
  "bus" in wine. On dark surfaces (hero/footer) "countri" is white and "bus"
  uses a lighter wine (#e39bac) so it stays legible on deep wine.
- **ADR-0025 One UI feel everywhere** — shared form-control styles
  (`components/ui/field.ts`: rounded, hairline border, wine focus ring) replace
  the per-form input strings across every form (auth, search, checkout,
  schedules, fleet, profile, commission, seat editor). Every dashboard page now
  uses the same header treatment (gold eyebrow + Fraunces display title) via
  `DashboardHeader` (or the inline equivalent for dynamic titles), and auth
  headings use the display font. Buttons (pill), cards and tokens were already
  shared, so the app reads as one system.

## Hero copy + admin-managed photo slider

- **ADR-0026 Homepage hero slider** — the hero headline/subtext were updated and
  the SVG scene is now a background photo slideshow when the admin has added
  images (crossfade carousel with dots; falls back to the scene when empty).
  `hero_images` holds the slides (public read of active rows — the policy checks
  only `is_active` so the anonymous homepage read never calls a helper the anon
  role can't execute; admins read/manage all). Images live in a public Storage
  bucket `hero`; the admin's own session uploads them (Storage RLS limits writes
  to platform admins — no service-role key needed). Managed at
  /dashboard/homepage (admin only): upload, reorder, hide, delete. The landing
  page is dynamic so new images appear without a redeploy. Server-action body
  limit raised to 7 MB for uploads.

## Homepage CMS

- **ADR-0027 Homepage content is editable** — every homepage section is now
  admin-editable from /dashboard/homepage: hero text, the photo slider, feature
  cards, the how-it-works steps and the operator banner. Content lives in
  `site_content` (one jsonb row per section, public read via a `true` policy,
  admin-only writes) and is merged over built-in defaults
  (`lib/content/homepage.ts`) by `getHomepageContent`, so the page renders
  before any edit and never breaks if a row is missing a field. Card/step icons
  are chosen from a fixed registry (icon name → lucide component). The landing
  page is dynamic, so edits appear immediately (verified end-to-end: edited the
  hero title in the dashboard → live homepage updated).

## Account chrome & mailing list

- **ADR-0028 Auth-aware public header, account page & mailing-list capture** —
  the public `SiteHeader` is now a server component that resolves the signed-in
  state once (`getAuthContext`, failing closed to logged-out) and hands it to an
  interactive client `SiteNav`. Signed-out visitors get **Sign in** +
  **Create an account**; signed-in users get **Manage account** and a
  **Sign out** button. A new customer-facing `/account` page shows profile
  details (name/email/phone), a link to My bookings (and the Operator portal
  only when the user is an operator) and its own Sign out button — so customers
  have a clear account hub with sign-out, distinct from the operator dashboard
  topbar. A "Never miss an update" mailing-list form sits on the footer band
  site-wide. Captures go to `newsletter_subscribers` (public INSERT, admin-only
  SELECT/manage; email stored lower-cased with a unique constraint + a
  `email = lower(email)` CHECK). The server action does a plain insert and
  treats a unique-violation (23505) as success, so re-subscribing is idempotent
  and never reveals list membership — a plain insert is used rather than
  `on conflict do nothing` because anonymous visitors have INSERT but not SELECT
  (the on-conflict path needs SELECT; the unique-violation path needs only
  INSERT). Verified end-to-end: subscribe persists and is idempotent; signed-in
  nav shows Manage account + Sign out; /account renders and sign-out returns to
  /login.

## Promotions & referrals

- **ADR-0029 Promo codes & referral rewards** — admins create promo codes
  (`promo_codes`: % discount with conditions — min fare, total/per-customer
  redemption caps, optional max-discount cap, validity window, active flag) from
  **/dashboard/promotions**. Every customer gets a shareable `referral_code`
  (generated in `handle_new_user`, backfilled for existing profiles); a signup
  carrying a code in its auth metadata records a `referrals` row (pending). The
  admin configures a singleton `referral_program` (enabled, referrer %, min
  qualifying fare, optional reward cap + validity). When a referred friend
  completes their **first paid booking**, an `after update of status` trigger
  (`on_booking_paid`) marks the referral qualified and grants the **referrer** a
  `referral_rewards` credit (% off their own next booking). Discounts are always
  recomputed server-side: `create_booking_from_hold` gained `p_promo_code` /
  `p_use_referral_reward`, validates via `promo_quote` (raising `PROMO:<reason>`
  on an invalid code) and writes `discount_kobo` + `grand_total_kobo`
  (`declare_luggage` already nets the discount). A promo takes precedence over a
  referral reward — never both on one booking. A referral reward is reserved on
  the pending booking (`bookings.referral_reward_id`) but only **consumed when the
  booking is paid**, so an abandoned checkout never burns it; usage caps count
  bookings in `pending_payment`/`paid`, so expired/cancelled bookings free quota.
  RLS: `promo_codes` is admin-only (customers use the `promo_quote` security-
  definer function for a live quote); a user reads only their own referrals and
  rewards. Validated end-to-end in `tests/db/phase9_promotions.sql` (25 checks)
  and live (admin create, account referral card, register `?ref=` prefill).

## Search alternatives, demo inventory & nav

- **ADR-0030 "Other routes" + demo inventory + always-on My bookings** — the
  Search page now shows the exact matches, then an **Other routes** section:
  `search_alternative_journeys` (security definer) returns upcoming bookable
  departures from the same origin terminal, same-destination other dates/times
  first (direct alternatives), then other destinations from that origin, always
  excluding the exact (origin, destination, date) already shown. (Terminals are
  one-per-city in the demo data, so "closer" is same-corridor alternatives.)
  `supabase/seed_demo_routes.sql` seeds 10 routes under the approved vendor
  Chisco Express — each its own 40-seat 2+2 coach with a published layout and
  three upcoming departures — so Search has live, bookable results; it is
  idempotent (guarded by DEMO-R01..R10 registration numbers) and authorises
  `publish_schedule` by setting the JWT to the demo Super Admin inside one
  transaction. The public header shows **My bookings** on every page for all
  visitors; when signed out, `/bookings` redirects to `/login?next=/bookings`.

## Popular Routes

- **ADR-0031 Homepage "Popular Routes" slider** — below the hero/search, the
  homepage shows a horizontal slider of popular-route cards. `list_popular_routes`
  (security definer) returns one card per corridor — the soonest upcoming
  *bookable* departure — ordered by how frequently that corridor runs (its count
  of upcoming published departures), so the cards are real and directly bookable.
  Each card shows the route (city → city), fare per seat, date and time, and a
  **Book now** button linking to /book/[schedule_id]. The slider is a scroll-snap
  row with prev/next arrows on desktop and swipe on mobile; it renders nothing
  when there is no inventory. Data-driven (not CMS-managed) so it always reflects
  live availability.

## Bookable-only trip finder

- **ADR-0032 Trip finder shows only bookable routes** — the From/To pickers (hero
  and /search) are now driven by `list_bookable_routes` (security definer):
  distinct (origin → destination) pairs that have at least one upcoming published
  departure with available seats. From lists only origins that have bookable
  trips; To is dependent — it lists only the destinations reachable from the
  chosen origin (and is re-clamped when the origin changes or on swap). This
  stops customers choosing a pair that returns an empty search. The forms degrade
  gracefully to a "No trips open right now" message when there is no inventory.
  Replaces the previous `listTerminalOptionsPublic` feed into the search forms.

## Vendor payouts (Paystack)

- **ADR-0033 Automatic vendor settlement via Paystack transfers** — vendors add a
  bank account under Org settings → Payout account (`vendor_payout_accounts`;
  when Paystack is configured the number is resolved and a transfer recipient is
  created, marking it verified). Paid bookings post `vendor_net` to the ledger;
  `process_due_payouts` (security definer, admin/service-role) sweeps unsettled
  `vendor_net` for vendors with a verified account into one `payouts` row each and
  links the ledger entries (idempotent — `financial_ledger.payout_id` prevents
  double-pay). The engine (`lib/payments/run-payouts.ts`) then pushes each
  scheduled payout to Paystack Transfers. It runs from the Finance page ("Run
  payouts now", admin) and from `POST /api/payouts/run` (bearer `PAYOUTS_CRON_SECRET`),
  which a scheduler calls hourly so vendors are paid within 24h. Without Paystack
  keys the framework still records accounts and schedules payouts (not sent).
  RLS: a vendor reads only their own account/payouts; admins all. Validated in
  `tests/db/phase10_payouts.sql` (11 checks).
