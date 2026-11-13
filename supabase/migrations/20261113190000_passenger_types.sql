-- ===========================================================================
-- Passenger types: Adult, Child (1–5), Child (6–10).
--
-- Pricing (computed on the server — clients never supply a fare):
--   * Adult        → full fare (base + any seat surcharge)
--   * Child 6–10   → half fare, occupies a selected seat
--   * Child 1–5    → FREE, rides on a lap (no seat selected)
--
-- Lap infants therefore have no seat, so booking_passengers.seat_id/seat_label
-- become nullable. Seat holds still equal the number of SEATED passengers
-- (adults + 6–10 children); infants are added at checkout and consume no seat.
-- ===========================================================================

create type public.passenger_type as enum ('adult', 'child_1_5', 'child_6_10');

alter table public.booking_passengers
  add column passenger_type public.passenger_type not null default 'adult';

-- Lap infants have no seat.
alter table public.booking_passengers alter column seat_id drop not null;
alter table public.booking_passengers alter column seat_label drop not null;

-- A seated passenger may never be a lap-infant type, and a lap infant must have
-- no seat. (unique (schedule_id, seat_id) already permits multiple NULL seats.)
alter table public.booking_passengers
  add constraint booking_passengers_seat_type_ck check (
    (passenger_type = 'child_1_5' and seat_id is null)
    or (passenger_type <> 'child_1_5' and seat_id is not null)
  );

-- ---------------------------------------------------------------------------
-- Rebuild create_booking_from_hold with passenger types + lap infants.
--   p_passengers : seated passengers, each { seat_id, full_name, phone?, email?, type }
--                  where type ∈ {adult, child_6_10}. Count must equal held seats.
--   p_infants    : lap infants, each { full_name, phone?, email? }. Free, no seat.
-- The server derives every fare from the passenger type — the client fare, if
-- any, is ignored.
-- ---------------------------------------------------------------------------
drop function if exists public.create_booking_from_hold(uuid, text, jsonb, jsonb);

create or replace function public.create_booking_from_hold(
  p_schedule uuid, p_hold_token text, p_contact jsonb, p_passengers jsonb, p_infants jsonb default '[]'::jsonb
)
returns table (booking_id uuid, reference text)
language plpgsql security definer set search_path = public as $$
declare
  v_vendor uuid; v_fare bigint; n int; n_inf int; held int; bk uuid; ref text;
  pitem jsonb; pid uuid; st record; bpid uuid; seatfare bigint; base bigint;
  ptype public.passenger_type; total bigint := 0;
begin
  select vendor_id, base_fare_kobo into v_vendor, v_fare from public.schedules where id = p_schedule and status = 'published';
  if v_vendor is null then raise exception 'schedule is not open for booking'; end if;

  n := coalesce(jsonb_array_length(p_passengers), 0);
  n_inf := coalesce(jsonb_array_length(p_infants), 0);
  if n = 0 then raise exception 'no seated passengers supplied'; end if;

  perform public.reconcile_expired_holds(p_schedule);
  select count(*) into held from public.schedule_seats where schedule_id = p_schedule and hold_token = p_hold_token and state = 'held';
  if held <> n then raise exception 'your seat hold has expired — please reselect your seats'; end if;

  ref := 'CB-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.bookings (reference, vendor_id, schedule_id, contact_name, contact_phone, contact_email, passenger_count, total_fare_kobo, grand_total_kobo, status, created_by, hold_token)
  values (ref, v_vendor, p_schedule, p_contact->>'name', p_contact->>'phone', p_contact->>'email', n + n_inf, 0, 0, 'pending_payment', auth.uid(), p_hold_token) returning id into bk;

  -- Seated passengers.
  for pitem in select jsonb_array_elements(p_passengers) loop
    ptype := coalesce(nullif(pitem->>'type', ''), 'adult')::public.passenger_type;
    if ptype = 'child_1_5' then
      raise exception 'a child aged 1–5 travels free on a lap and cannot hold a seat';
    end if;
    select * into st from public.schedule_seats where schedule_id = p_schedule and seat_id = (pitem->>'seat_id') and hold_token = p_hold_token and state = 'held';
    if st.seat_id is null then raise exception 'a selected seat is no longer held'; end if;

    base := v_fare + coalesce(st.surcharge_kobo, 0);
    seatfare := case when ptype = 'child_6_10' then round(base::numeric / 2) else base end;
    total := total + seatfare;

    insert into public.passengers (booking_id, full_name, phone, email) values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, st.seat_id, st.seat_label, seatfare, ptype) returning id into bpid;
    update public.schedule_seats set booking_passenger_id = bpid where schedule_id = p_schedule and seat_id = st.seat_id;
  end loop;

  -- Lap infants (free, no seat).
  for pitem in select jsonb_array_elements(p_infants) loop
    insert into public.passengers (booking_id, full_name, phone, email) values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, null, null, 0, 'child_1_5');
  end loop;

  update public.bookings set total_fare_kobo = total, grand_total_kobo = total where id = bk;
  insert into public.booking_status_history (booking_id, to_status, note) values (bk, 'pending_payment', 'created from hold');
  return query select bk, ref;
end;
$$;
revoke all on function public.create_booking_from_hold(uuid, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_booking_from_hold(uuid, text, jsonb, jsonb, jsonb) to anon, authenticated, service_role;
