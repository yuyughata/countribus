# Database Schema — Countribus

Target PostgreSQL schema (plan §6 + Addendum). This is the blueprint for
`supabase/migrations/*`. Conventions:

- Primary keys are `uuid default gen_random_uuid()` unless noted.
- Money is `bigint` kobo + `currency text default 'NGN'`. Never numeric/float.
- Timestamps are `timestamptz`; `created_at`/`updated_at default now()`.
- Every vendor-owned table has `vendor_id uuid not null references vendors(id)`
  and RLS (see `SECURITY_AND_RLS.md`). RLS is enabled in the same migration that
  creates the table.
- Status fields use Postgres `enum`/`check` constraints, not free text.

Legend: **PK** primary key · **FK** foreign key · **UQ** unique · **CK** check.

---

## Identity & access

### `profiles`

Mirrors `auth.users` (1:1, PK = `auth.users.id`). `full_name`, `phone`, `email`,
`avatar_path`, `is_platform_admin boolean default false`, timestamps.

### `vendors`

`id` PK, `name`, `slug` UQ (for branded portal URL), `status` enum
(`pending`,`approved`,`suspended`,`rejected`), `contact_email`, `contact_phone`,
`logo_path`, `commission_rate_bps int null` (vendor override), `approved_by`,
`approved_at`, timestamps.

### `vendor_staff`

Membership + role. `id` PK, `vendor_id` FK, `user_id` FK→profiles,
`role` enum (`vendor_owner`,`vendor_manager`,`booking_officer`,
`terminal_staff`,`luggage_officer`,`finance_officer`), `assigned_terminal_id`
FK→terminals null, `is_active boolean`, timestamps. **UQ(vendor_id, user_id)**.

### `platform_roles` / `role_permissions`

Optional explicit permission catalog mirroring `lib/permissions/roles.ts` for
auditable platform-level grants (super admin, finance officer). Keep the TS
matrix and these tables in sync.

---

## Locations

### `states` — seed all 36 + FCT

`id` PK, `code` UQ (e.g. `LA`), `name`.

### `cities`

`id` PK, `state_id` FK, `name`. **UQ(state_id, name)**.

### `terminals`

`id` PK, `vendor_id` FK null (platform or vendor-owned), `city_id` FK, `name`,
`address`, `latitude`, `longitude`, `is_active`. Searchable.

### `location_aliases`

`id` PK, `terminal_id`/`city_id` FK, `alias` — for fuzzy search.

---

## Fleet

### `vehicle_categories`

`id` PK, `key` UQ (`eighteen_seater`,`coaster`,`luxury_coach`), `name`,
`description`. **A category is not a seat layout.**

### `vehicles`

`id` PK, `vendor_id` FK, `category_id` FK, `registration_no`, `display_name`,
`capacity int`, `status` enum (`active`,`inactive`,`maintenance`),
`photos` (storage paths), timestamps. **UQ(vendor_id, registration_no)**.
RLS: vendor-scoped. **Only super_admin / vendor_owner / vendor_manager mutate.**

### `seat_templates`

Versioned layout definitions. `id` PK, `vendor_id` FK, `vehicle_id` FK null
(template may be reusable or per-vehicle), `name`, `version int`,
`rows int`, `columns int`, `is_published boolean`, timestamps.
**UQ(vehicle_id, version)** where applicable.

### `seat_template_seats`

`id` PK, `seat_template_id` FK, `seat_label` (e.g. `1A`), `row int`, `col int`,
`seat_type` enum (`standard`,`window`,`aisle`,`driver`,`blocked`),
`is_sellable boolean`. **UQ(seat_template_id, seat_label)**.

### `vehicle_seats`

Concrete sellable seats for a vehicle's current layout (derived from the active
template). Used as the catalog seats are snapshotted from at schedule publish.

---

## Routes & trips

### `routes`

`id` PK, `vendor_id` FK, `origin_terminal_id` FK, `destination_terminal_id` FK,
`name`, `is_active`. MVP = direct journeys.

### `route_stops`

Future multi-leg support. `id` PK, `route_id` FK, `terminal_id` FK,
`stop_order int`, `is_pickup`, `is_dropoff`.

### `schedules`

A concrete departure. `id` PK, `vendor_id` FK, `route_id` FK,
`vehicle_id` FK, `seat_template_version int` (**snapshot**),
`departure_at timestamptz`, `arrival_estimate_at`, `base_fare_kobo bigint`,
`currency`, `booking_cutoff_at`, `status` enum
(`draft`,`published`,`cancelled`,`departed`,`completed`),
`capacity int`, timestamps.
CK: `departure_at > now()` at publish. See overlap rule below.

### `schedule_vehicle_assignments`

History of vehicle↔schedule assignments with `assigned_at`, `released_at`.
Enforce **no overlapping assignments / impossible turnaround** per vehicle (DB
exclusion constraint on `tstzrange(departure_at, arrival_estimate_at + buffer)`
per `vehicle_id`, or validated in a transaction).

---

## Seat inventory

### `schedule_seats`

Per-schedule sellable inventory, generated at publish from the snapshotted
layout. `id` PK, `schedule_id` FK, `seat_label`, `seat_id` (stable ref),
`state` enum (`available`,`booked`,`held`,`blocked`), `booking_passenger_id` FK
null, timestamps.
**Critical:** partial unique index guaranteeing a seat is allocated at most once
per schedule for active states:
`CREATE UNIQUE INDEX ON schedule_seats (schedule_id, seat_id) WHERE state IN ('booked','held');`

### `seat_holds`

`id` PK, `schedule_id` FK, `seat_id`, `held_by` (session/user), `expires_at`,
`status` enum (`active`,`converted`,`expired`,`released`), timestamps.
Hold creation + conversion to booking is atomic (transaction). Expiry reconciled
by a scheduled job + lazy check on read.

### `seat_inventory_events`

Append-only audit of state transitions: `schedule_id`, `seat_id`, `from_state`,
`to_state`, `actor`, `reason`, `created_at`.

---

## Bookings

### `bookings`

`id` PK, `reference` UQ (opaque, non-guessable), `vendor_id` FK, `schedule_id`
FK, `contact_name`, `contact_phone`, `contact_email` null, `passenger_count int`,
`total_fare_kobo`, `luggage_fee_kobo`, `discount_kobo`, `grand_total_kobo`,
`currency`, `status` enum
(`pending_payment`,`paid`,`failed`,`cancelled`,`refunded`,`expired`),
`created_by` null (passenger or booking officer), timestamps.

### `passengers`

`id` PK, `booking_id` FK, `full_name`, `phone`, `email` null,
`emergency_contact` null.

### `booking_passengers`

Links a passenger to a specific seat + ticket. `id` PK, `booking_id` FK,
`passenger_id` FK, `schedule_id` FK, `seat_id`, `seat_label`, `fare_kobo`,
`boarding_status` enum (`not_checked_in`,`checked_in`,`boarded`,`no_show`).
**UQ(schedule_id, seat_id)** for confirmed rows.

### `booking_status_history`

Append-only: `booking_id`, `from_status`, `to_status`, `actor`, `note`,
`created_at`.

---

## Payments & finance

### `payment_transactions`

`id` PK, `booking_id` FK, `provider` enum (`paystack`,`flutterwave`),
`provider_reference` UQ, `amount_kobo`, `currency`,
`status` enum (`initialized`,`pending`,`success`,`failed`,`abandoned`),
`initialized_at`, `verified_at`, `raw_meta jsonb`.

### `webhook_events`

Idempotency ledger. `id` PK, `provider`, `provider_event_id` UQ,
`payload jsonb`, `signature_valid boolean`, `processed_at`, `result`.
**UQ(provider, provider_event_id)** → duplicate webhooks are no-ops.

### `commission_rules`

`id` PK, `scope` enum (`platform`,`vendor`), `vendor_id` FK null,
`rate_bps int`, `basis` enum (`base_fare`,`fare_plus_fees`),
`effective_from`, `effective_to` null.

### `financial_ledger` — append-only

`id` PK, `booking_id` FK null, `vendor_id` FK, `entry_type` enum
(`booking_gross`,`platform_commission`,`provider_fee`,`refund`,`reversal`,
`adjustment`), `amount_kobo` (signed), `currency`, `related_entry_id` FK null,
`created_at`. No updates/deletes — corrections are compensating entries.

### `settlements` / `refunds`

`settlements`: vendor payout batches (later phase). `refunds`: `booking_id`,
`amount_kobo`, `reason`, `status`, provider refund reference.

---

## Luggage

### `luggage_items`

`id` PK, `booking_passenger_id` FK, `type` enum
(`handbag`,`small_bag`,`medium_bag`,`large_bag`,`suitcase`,`carton`,`sack`,`other`),
`quantity int`, `weight_kg numeric null`, `dimensions text null`,
`photo_path null`, `handling_notes null`, `fee_kobo`.

### `luggage_tags`

`id` PK, `luggage_item_id` FK, `code` UQ (QR/barcode, non-guessable), links to
booking/passenger/seat/vehicle/route/travel date, `issued_at`.

### `luggage_events`

Append-only scan trail. `id` PK, `luggage_tag_id` FK, `event` enum
(`accepted`,`loaded`,`unloaded`,`returned`,`exception`), `actor`, `terminal_id`,
`notes`, `created_at`.

### `luggage_policies`

Per-vendor: `free_allowance_kg`, `max_weight_kg`, `prohibited_items jsonb`,
`extra_charge_rules jsonb`.

---

## Operations & comms

### `boarding_events`

`id` PK, `booking_passenger_id` FK, `schedule_id` FK, `event` enum
(`checked_in`,`boarded`), `actor`, `terminal_id`, `created_at`.

### `notifications` / `notification_preferences`

Outbound message log (`channel` email/sms/whatsapp/in_app, `status`,
`provider_message_id`, retries) + per-user channel/consent preferences.

### `audit_logs`

`id` PK, `actor`, `vendor_id` null, `action`, `entity`, `entity_id`,
`metadata jsonb`, `created_at`. For vendor approval, vehicle changes, schedule
changes, financial actions, staff permissions, manual overrides.

---

## Tickets & manifests (Addendum 1)

### `ticket_documents`

`id` PK, `booking_id` FK, `passenger_id` FK, `schedule_id` FK, `storage_path`,
`document_version int`, `generated_at`, `generated_by` null (null = system),
`status` enum (`active`,`revoked`,`reissued`), `revoked_at`, `revoke_reason`.
Generated **only after verified payment**. QR identifier unique + non-guessable;
verification checks current server-side status.

### `ticket_delivery_events`

`id` PK, `ticket_document_id` FK, `channel` enum (`email`,`sms`,`whatsapp`),
`recipient` (minimised), `provider_message_id`, `attempted_at`,
`delivery_status` enum (`queued`,`sent`,`delivered`,`failed`), `error null`.

Vendor departure manifests are **derived** from `bookings`, `passengers`,
`booking_passengers`, `schedules`, `vehicles`, `luggage_*` — do not maintain a
second passenger list. A lockable final snapshot may be persisted with an audit
trail of later authorised changes.

---

## Support & growth (launch-lean)

`support_tickets`, `customer_reviews`, `promotional_codes`, `booking_discounts`
— implement only what launch needs.

## Enforcement summary

| Invariant                      | Mechanism                                                      |
| ------------------------------ | -------------------------------------------------------------- |
| Seat sold once per schedule    | partial unique index on active `(schedule_id, seat_id)`        |
| Atomic hold → booking          | transaction + conditional update / `select … for update`       |
| Layout snapshot immutability   | `schedules.seat_template_version` + generated `schedule_seats` |
| No vehicle double-booking      | exclusion constraint on time ranges per `vehicle_id`           |
| Paid only via verified webhook | status set by server after signature + provider verify         |
| Idempotent webhooks            | `webhook_events` UQ `(provider, provider_event_id)`            |
| Tenant isolation               | `vendor_id` + RLS + server authz                               |
| Append-only ledger             | no update/delete grants; compensating entries                  |
