-- ===========================================================================
-- Phase 5 — Bookings, payments, commission ledger, tickets.
-- ===========================================================================
-- Invariants (plan §6/§7):
--  * A booking becomes paid ONLY from a verified provider webhook/response.
--  * Webhook processing is idempotent (webhook_events unique per provider event).
--  * The financial ledger is append-only; corrections are compensating entries.
--  * Money is integer kobo; commission is basis points.

create type public.booking_status as enum
  ('pending_payment', 'paid', 'failed', 'cancelled', 'refunded', 'expired');
create type public.boarding_status as enum
  ('not_checked_in', 'checked_in', 'boarded', 'no_show');
create type public.payment_provider as enum ('paystack', 'flutterwave');
create type public.payment_status as enum
  ('initialized', 'pending', 'success', 'failed', 'abandoned');
create type public.ledger_entry_type as enum
  ('booking_gross', 'platform_commission', 'vendor_net', 'provider_fee', 'refund', 'reversal', 'adjustment');
create type public.commission_basis as enum ('base_fare', 'fare_plus_fees');

-- Bookings ----------------------------------------------------------------
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  vendor_id        uuid not null references public.vendors (id) on delete restrict,
  schedule_id      uuid not null references public.schedules (id) on delete restrict,
  contact_name     text not null,
  contact_phone    text not null,
  contact_email    text,
  passenger_count  int not null check (passenger_count > 0),
  total_fare_kobo  bigint not null check (total_fare_kobo >= 0),
  luggage_fee_kobo bigint not null default 0 check (luggage_fee_kobo >= 0),
  discount_kobo    bigint not null default 0 check (discount_kobo >= 0),
  grand_total_kobo bigint not null check (grand_total_kobo >= 0),
  currency         text not null default 'NGN',
  status           public.booking_status not null default 'pending_payment',
  created_by       uuid references auth.users (id),
  hold_token       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index bookings_vendor_idx on public.bookings (vendor_id);
create index bookings_schedule_idx on public.bookings (schedule_id);
create index bookings_created_by_idx on public.bookings (created_by);
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.passengers (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings (id) on delete cascade,
  full_name         text not null,
  phone             text,
  email             text,
  emergency_contact text
);

create table public.booking_passengers (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  passenger_id    uuid not null references public.passengers (id) on delete cascade,
  schedule_id     uuid not null references public.schedules (id) on delete restrict,
  seat_id         text not null,
  seat_label      text not null,
  fare_kobo       bigint not null,
  boarding_status public.boarding_status not null default 'not_checked_in',
  unique (schedule_id, seat_id)
);
create index booking_passengers_booking_idx on public.booking_passengers (booking_id);

create table public.booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status   public.booking_status not null,
  actor_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);

-- Payments ----------------------------------------------------------------
create table public.payment_transactions (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.bookings (id) on delete cascade,
  provider           public.payment_provider not null,
  provider_reference text not null,
  amount_kobo        bigint not null,
  currency           text not null default 'NGN',
  status             public.payment_status not null default 'initialized',
  raw_meta           jsonb not null default '{}'::jsonb,
  initialized_at     timestamptz not null default now(),
  verified_at        timestamptz,
  unique (provider, provider_reference)
);
create index payment_transactions_booking_idx on public.payment_transactions (booking_id);

-- Idempotency ledger for provider webhooks.
create table public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          public.payment_provider not null,
  provider_event_id text not null,
  payload           jsonb not null default '{}'::jsonb,
  signature_valid   boolean,
  result            text,
  processed_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.commission_rules (
  id             uuid primary key default gen_random_uuid(),
  scope          text not null check (scope in ('platform', 'vendor')),
  vendor_id      uuid references public.vendors (id) on delete cascade,
  rate_bps       int not null check (rate_bps between 0 and 10000),
  basis          public.commission_basis not null default 'base_fare',
  effective_from timestamptz not null default now(),
  effective_to   timestamptz
);
insert into public.commission_rules (scope, rate_bps, basis) values ('platform', 1000, 'base_fare');

-- Append-only ledger.
create table public.financial_ledger (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid references public.bookings (id) on delete set null,
  vendor_id        uuid not null references public.vendors (id) on delete restrict,
  entry_type       public.ledger_entry_type not null,
  amount_kobo      bigint not null,
  currency         text not null default 'NGN',
  related_entry_id uuid references public.financial_ledger (id),
  created_at       timestamptz not null default now()
);
create index financial_ledger_vendor_idx on public.financial_ledger (vendor_id, created_at desc);
create index financial_ledger_booking_idx on public.financial_ledger (booking_id);

-- Tickets (Addendum 1) ----------------------------------------------------
create table public.ticket_documents (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings (id) on delete cascade,
  passenger_id     uuid not null references public.passengers (id) on delete cascade,
  schedule_id      uuid not null references public.schedules (id) on delete restrict,
  qr_token         text not null unique default encode(gen_random_bytes(16), 'hex'),
  storage_path     text,
  document_version int not null default 1,
  status           text not null default 'active' check (status in ('active', 'revoked', 'reissued')),
  generated_at     timestamptz not null default now(),
  revoked_at       timestamptz,
  revoke_reason    text
);
create index ticket_documents_booking_idx on public.ticket_documents (booking_id);

create table public.ticket_delivery_events (
  id                  uuid primary key default gen_random_uuid(),
  ticket_document_id  uuid not null references public.ticket_documents (id) on delete cascade,
  channel             text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient           text,
  provider_message_id text,
  attempted_at        timestamptz not null default now(),
  delivery_status     text not null default 'queued' check (delivery_status in ('queued', 'sent', 'delivered', 'failed')),
  error               text
);

-- =========================================================================
-- Functions
-- =========================================================================

-- Create a pending booking from a valid seat hold (prices computed server-side).
create or replace function public.create_booking_from_hold(
  p_schedule uuid, p_hold_token text, p_contact jsonb, p_passengers jsonb
) returns table (booking_id uuid, reference text)
language plpgsql security definer set search_path = public as $$
declare v_vendor uuid; v_fare bigint; n int; held int; bk uuid; ref text; pitem jsonb; pid uuid; st record; bpid uuid;
begin
  select vendor_id, base_fare_kobo into v_vendor, v_fare from public.schedules
    where id = p_schedule and status = 'published';
  if v_vendor is null then raise exception 'schedule is not open for booking'; end if;
  n := coalesce(jsonb_array_length(p_passengers), 0);
  if n = 0 then raise exception 'no passengers supplied'; end if;

  perform public.reconcile_expired_holds(p_schedule);
  select count(*) into held from public.schedule_seats
    where schedule_id = p_schedule and hold_token = p_hold_token and state = 'held';
  if held <> n then raise exception 'your seat hold has expired — please reselect your seats'; end if;

  ref := 'CB-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.bookings (reference, vendor_id, schedule_id, contact_name, contact_phone, contact_email,
    passenger_count, total_fare_kobo, grand_total_kobo, status, created_by, hold_token)
  values (ref, v_vendor, p_schedule, p_contact->>'name', p_contact->>'phone', p_contact->>'email',
    n, v_fare * n, v_fare * n, 'pending_payment', auth.uid(), p_hold_token)
  returning id into bk;

  for pitem in select jsonb_array_elements(p_passengers) loop
    select * into st from public.schedule_seats
      where schedule_id = p_schedule and seat_id = (pitem->>'seat_id')
        and hold_token = p_hold_token and state = 'held';
    if st.seat_id is null then raise exception 'a selected seat is no longer held'; end if;
    insert into public.passengers (booking_id, full_name, phone, email)
      values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo)
      values (bk, pid, p_schedule, st.seat_id, st.seat_label, v_fare) returning id into bpid;
    update public.schedule_seats set booking_passenger_id = bpid where schedule_id = p_schedule and seat_id = st.seat_id;
  end loop;

  insert into public.booking_status_history (booking_id, to_status, note)
    values (bk, 'pending_payment', 'created from hold');
  return query select bk, ref;
end;
$$;
revoke all on function public.create_booking_from_hold(uuid, text, jsonb, jsonb) from public;
grant execute on function public.create_booking_from_hold(uuid, text, jsonb, jsonb) to anon, authenticated, service_role;

-- Confirm payment from a VERIFIED provider event. Idempotent. Called only by
-- the server webhook handler after signature + status verification.
create or replace function public.confirm_payment(
  p_provider public.payment_provider, p_event_id text, p_reference text, p_amount_kobo bigint
) returns text
language plpgsql security definer set search_path = public as $$
declare ins int; v_booking uuid; v_total bigint; v_vendor uuid; v_status public.booking_status; rate int; comm bigint; vnet bigint;
begin
  insert into public.webhook_events (provider, provider_event_id, signature_valid, result)
    values (p_provider, p_event_id, true, 'processing')
    on conflict (provider, provider_event_id) do nothing;
  get diagnostics ins = row_count;
  if ins = 0 then return 'duplicate'; end if;

  select booking_id into v_booking from public.payment_transactions
    where provider = p_provider and provider_reference = p_reference;
  if v_booking is null then
    update public.webhook_events set result = 'unknown_reference', processed_at = now()
      where provider = p_provider and provider_event_id = p_event_id;
    return 'unknown_reference';
  end if;

  select grand_total_kobo, vendor_id, status into v_total, v_vendor, v_status
    from public.bookings where id = v_booking for update;

  if v_status = 'paid' then
    update public.webhook_events set result = 'already_paid', processed_at = now()
      where provider = p_provider and provider_event_id = p_event_id;
    return 'already_paid';
  end if;

  if p_amount_kobo <> v_total then
    update public.payment_transactions set status = 'failed'
      where provider = p_provider and provider_reference = p_reference;
    update public.webhook_events set result = 'amount_mismatch', processed_at = now()
      where provider = p_provider and provider_event_id = p_event_id;
    return 'amount_mismatch';
  end if;

  update public.schedule_seats set state = 'booked', held_until = null, hold_token = null
    where booking_passenger_id in (select id from public.booking_passengers where booking_id = v_booking);
  update public.payment_transactions set status = 'success', verified_at = now()
    where provider = p_provider and provider_reference = p_reference;
  update public.bookings set status = 'paid' where id = v_booking;
  insert into public.booking_status_history (booking_id, from_status, to_status, note)
    values (v_booking, v_status, 'paid', 'payment verified via ' || p_provider);

  select rate_bps into rate from public.commission_rules
    where scope = 'platform' and vendor_id is null order by effective_from desc limit 1;
  rate := coalesce(rate, 1000);
  comm := round(v_total::numeric * rate / 10000);
  vnet := v_total - comm;
  insert into public.financial_ledger (booking_id, vendor_id, entry_type, amount_kobo) values
    (v_booking, v_vendor, 'booking_gross', v_total),
    (v_booking, v_vendor, 'platform_commission', -comm),
    (v_booking, v_vendor, 'vendor_net', vnet);

  insert into public.ticket_documents (booking_id, passenger_id, schedule_id)
    select v_booking, bp.passenger_id, bp.schedule_id from public.booking_passengers bp where bp.booking_id = v_booking;

  update public.webhook_events set result = 'confirmed', processed_at = now()
    where provider = p_provider and provider_event_id = p_event_id;
  return 'confirmed';
end;
$$;
revoke all on function public.confirm_payment(public.payment_provider, text, text, bigint) from public, anon, authenticated;
grant execute on function public.confirm_payment(public.payment_provider, text, text, bigint) to service_role;

-- Cancel a booking (frees seats, revokes tickets). Owner/manager/admin or the
-- booking owner (while pending).
create or replace function public.cancel_booking(p_booking uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_vendor uuid; v_status public.booking_status; v_owner uuid;
begin
  select vendor_id, status, created_by into v_vendor, v_status, v_owner from public.bookings where id = p_booking for update;
  if v_vendor is null then raise exception 'booking not found'; end if;
  if not (public.is_platform_admin()
          or public.has_vendor_role(v_vendor, array['vendor_owner','vendor_manager','booking_officer']::public.vendor_role[])
          or (v_owner is not null and v_owner = auth.uid())) then
    raise exception 'not authorized to cancel this booking';
  end if;
  if v_status in ('cancelled', 'refunded') then return; end if;

  update public.schedule_seats set state = 'available', held_until = null, hold_token = null, booking_passenger_id = null
    where booking_passenger_id in (select id from public.booking_passengers where booking_id = p_booking);
  update public.ticket_documents set status = 'revoked', revoked_at = now(), revoke_reason = coalesce(p_reason, 'booking cancelled')
    where booking_id = p_booking and status = 'active';
  update public.bookings set status = 'cancelled' where id = p_booking;
  insert into public.booking_status_history (booking_id, from_status, to_status, actor_id, note)
    values (p_booking, v_status, 'cancelled', auth.uid(), p_reason);
end;
$$;
revoke all on function public.cancel_booking(uuid, text) from public;
grant execute on function public.cancel_booking(uuid, text) to authenticated, service_role;

-- =========================================================================
-- Grants + RLS
-- =========================================================================
grant select on public.bookings, public.passengers, public.booking_passengers,
  public.ticket_documents to authenticated;
grant all on public.bookings, public.passengers, public.booking_passengers, public.booking_status_history,
  public.payment_transactions, public.webhook_events, public.commission_rules, public.financial_ledger,
  public.ticket_documents, public.ticket_delivery_events to service_role;

alter table public.bookings enable row level security;
alter table public.passengers enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.commission_rules enable row level security;
alter table public.financial_ledger enable row level security;
alter table public.ticket_documents enable row level security;
alter table public.ticket_delivery_events enable row level security;

-- Booking owner (the passenger) or the vendor's staff/admin may read a booking.
create policy bookings_select on public.bookings for select to authenticated
  using (
    (created_by is not null and created_by = auth.uid())
    or public.is_platform_admin()
    or vendor_id in (select public.current_vendor_ids())
  );
create policy passengers_select on public.passengers for select to authenticated
  using (booking_id in (select id from public.bookings));
create policy booking_passengers_select on public.booking_passengers for select to authenticated
  using (booking_id in (select id from public.bookings));
create policy ticket_documents_select on public.ticket_documents for select to authenticated
  using (booking_id in (select id from public.bookings));

-- Finance visibility: platform admin + vendor members see their ledger.
create policy financial_ledger_select on public.financial_ledger for select to authenticated
  using (public.is_platform_admin() or vendor_id in (select public.current_vendor_ids()));
create policy commission_rules_select on public.commission_rules for select to authenticated
  using (public.is_platform_admin() or (vendor_id is not null and vendor_id in (select public.current_vendor_ids())));
create policy booking_status_history_select on public.booking_status_history for select to authenticated
  using (booking_id in (select id from public.bookings));
-- payment_transactions / webhook_events: no authenticated access (service role only).
