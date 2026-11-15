-- ===========================================================================
-- Walk-in (counter) bookings.
-- ===========================================================================
-- Staff at a terminal sell a seat face-to-face and take payment in cash, by POS
-- card or by bank transfer. The booking is created and paid in one atomic step
-- (the customer has already handed over the money) and draws on the SAME seat
-- inventory as online bookings, so a seat can never be double-sold across
-- channels.
--
-- POLICY NOTE (deliberate exception to the "paid only from a verified provider
-- webhook" invariant — see docs/DECISIONS.md): a counter sale has no payment
-- provider webhook. `create_walkin_booking` is therefore the one audited,
-- capability-gated path that sets status='paid' without a webhook. It is
-- restricted to the vendor's owner/manager/booking officer (or platform admin),
-- records who took the money and by which method, and is idempotent on the
-- booking (one counter payment per booking).

-- Channel + staff attribution -----------------------------------------------
create type public.booking_channel as enum ('online', 'walk_in');

alter table public.bookings
  add column channel public.booking_channel not null default 'online';

-- The staff member credited with the sale (walk-in only). `created_by` is the
-- acting user for both channels; `sold_by` is set only for counter sales and is
-- what staff-sales incentives attribute against.
alter table public.bookings
  add column sold_by uuid references auth.users (id);

create index bookings_channel_idx on public.bookings (channel);
create index bookings_sold_by_idx on public.bookings (sold_by) where sold_by is not null;

-- Counter payments ----------------------------------------------------------
create type public.counter_method as enum ('cash', 'pos', 'transfer');

create table public.counter_payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  vendor_id   uuid not null references public.vendors (id) on delete restrict,
  method      public.counter_method not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency    text not null default 'NGN',
  receipt_ref text not null,
  received_by uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  -- One counter payment per booking: prevents a duplicate payment record.
  unique (booking_id)
);
create index counter_payments_vendor_idx on public.counter_payments (vendor_id, created_at desc);

-- Create AND pay a walk-in booking in one atomic step. SECURITY DEFINER; the
-- authorization check inside restricts it to vendor owner/manager/booking
-- officer (or platform admin). Prices are computed server-side; the client
-- never supplies a fare. Seats are claimed with the same concurrency-safe
-- available->booked UPDATE the online flow uses, so cross-channel double-booking
-- is impossible (backed by the schedule_seats partial unique index).
create or replace function public.create_walkin_booking(
  p_schedule uuid,
  p_contact jsonb,
  p_passengers jsonb,
  p_infants jsonb default '[]'::jsonb,
  p_method public.counter_method default 'cash',
  p_receipt_ref text default null
) returns table (booking_id uuid, reference text, amount_kobo bigint)
language plpgsql security definer set search_path = public as $function$
declare
  v_uid uuid := auth.uid();
  v_vendor uuid; v_fare bigint; n int; n_inf int; bk uuid; ref text;
  pitem jsonb; pid uuid; st record; bpid uuid; seatfare bigint; base bigint;
  ptype public.passenger_type; total bigint := 0; cnt int;
  rate int; comm bigint; vnet bigint; v_receipt text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select vendor_id, base_fare_kobo into v_vendor, v_fare
    from public.schedules where id = p_schedule and status = 'published';
  if v_vendor is null then raise exception 'schedule is not open for booking'; end if;

  -- Authorization: counter sales are for the vendor's sales staff only.
  if not (public.is_platform_admin()
          or public.has_vendor_role(v_vendor,
               array['vendor_owner','vendor_manager','booking_officer']::public.vendor_role[])) then
    raise exception 'not authorized to record a walk-in booking for this operator';
  end if;

  n := coalesce(jsonb_array_length(p_passengers), 0);
  n_inf := coalesce(jsonb_array_length(p_infants), 0);
  if n = 0 then raise exception 'no seated passengers supplied'; end if;
  if (p_contact->>'name') is null or btrim(p_contact->>'name') = '' then
    raise exception 'passenger name is required';
  end if;
  if (p_contact->>'phone') is null or btrim(p_contact->>'phone') = '' then
    raise exception 'passenger phone number is required';
  end if;

  -- Free any lapsed holds so abandoned online carts don't block the counter.
  perform public.reconcile_expired_holds(p_schedule);

  ref := 'CB-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.bookings
    (reference, vendor_id, schedule_id, contact_name, contact_phone, contact_email,
     passenger_count, total_fare_kobo, grand_total_kobo, status, channel, created_by, sold_by)
  values
    (ref, v_vendor, p_schedule, p_contact->>'name', p_contact->>'phone', p_contact->>'email',
     n + n_inf, 0, 0, 'pending_payment', 'walk_in', v_uid, v_uid)
  returning id into bk;

  -- Seated passengers: claim each seat atomically (available -> booked).
  for pitem in select jsonb_array_elements(p_passengers) loop
    ptype := coalesce(nullif(pitem->>'type', ''), 'adult')::public.passenger_type;
    if ptype = 'child_1_5' then
      raise exception 'a child aged 1–5 travels free on a lap and cannot hold a seat';
    end if;

    update public.schedule_seats
      set state = 'booked', held_until = null, hold_token = null
      where schedule_id = p_schedule and seat_id = (pitem->>'seat_id') and state = 'available';
    get diagnostics cnt = row_count;
    if cnt <> 1 then
      raise exception 'seat % is no longer available', pitem->>'seat_id';
    end if;

    select * into st from public.schedule_seats
      where schedule_id = p_schedule and seat_id = (pitem->>'seat_id');
    base := v_fare + coalesce(st.surcharge_kobo, 0);
    seatfare := case when ptype = 'child_6_10' then round(base::numeric / 2) else base end;
    total := total + seatfare;

    insert into public.passengers (booking_id, full_name, phone, email)
      values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers
      (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, st.seat_id, st.seat_label, seatfare, ptype) returning id into bpid;
    update public.schedule_seats set booking_passenger_id = bpid
      where schedule_id = p_schedule and seat_id = st.seat_id;
  end loop;

  -- Lap infants (free, no seat).
  for pitem in select jsonb_array_elements(p_infants) loop
    insert into public.passengers (booking_id, full_name, phone, email)
      values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers
      (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, null, null, 0, 'child_1_5');
  end loop;

  -- Mark paid (counter cash/POS/transfer already collected).
  update public.bookings
    set total_fare_kobo = total, grand_total_kobo = total, status = 'paid'
    where id = bk;
  insert into public.booking_status_history (booking_id, to_status, actor_id, note)
    values (bk, 'pending_payment', v_uid, 'walk-in booking created at counter');
  insert into public.booking_status_history (booking_id, from_status, to_status, actor_id, note)
    values (bk, 'pending_payment', 'paid', v_uid, 'walk-in payment recorded (' || p_method || ')');

  -- Platform commission split (same basis as online confirm_payment).
  select rate_bps into rate from public.commission_rules
    where scope = 'platform' and vendor_id is null order by effective_from desc limit 1;
  rate := coalesce(rate, 1000);
  comm := round(total::numeric * rate / 10000);
  vnet := total - comm;
  insert into public.financial_ledger (booking_id, vendor_id, entry_type, amount_kobo) values
    (bk, v_vendor, 'booking_gross', total),
    (bk, v_vendor, 'platform_commission', -comm),
    (bk, v_vendor, 'vendor_net', vnet);

  -- Electronic tickets.
  insert into public.ticket_documents (booking_id, passenger_id, schedule_id)
    select bk, bp.passenger_id, bp.schedule_id from public.booking_passengers bp where bp.booking_id = bk;

  -- Audited counter payment record (idempotent per booking).
  v_receipt := coalesce(nullif(btrim(coalesce(p_receipt_ref, '')), ''), ref);
  insert into public.counter_payments (booking_id, vendor_id, method, amount_kobo, receipt_ref, received_by)
    values (bk, v_vendor, p_method, total, v_receipt, v_uid);

  return query select bk, ref, total;
end;
$function$;
revoke all on function public.create_walkin_booking(uuid, jsonb, jsonb, jsonb, public.counter_method, text) from public, anon;
grant execute on function public.create_walkin_booking(uuid, jsonb, jsonb, jsonb, public.counter_method, text) to authenticated, service_role;

-- Grants + RLS --------------------------------------------------------------
grant select on public.counter_payments to authenticated;
grant all on public.counter_payments to service_role;

alter table public.counter_payments enable row level security;

-- Platform admin + the owning vendor's members may read counter payments.
create policy counter_payments_select on public.counter_payments for select to authenticated
  using (public.is_platform_admin() or vendor_id in (select public.current_vendor_ids()));

notify pgrst, 'reload schema';
