-- ===========================================================================
-- Unpaid bookings auto-expire after 30 minutes.
-- A booking is created 'pending_payment' (unpaid); it holds its seats and stays
-- payable for 30 minutes, after which it is automatically cancelled ('expired')
-- and its seats released.
-- ===========================================================================

-- Payment window: new bookings default to 30 minutes from creation.
alter table public.bookings
  add column payment_deadline timestamptz not null default (now() + interval '30 minutes');

-- Backfill any in-flight unpaid bookings so they too get a deadline.
update public.bookings
  set payment_deadline = created_at + interval '30 minutes'
  where status = 'pending_payment';

create index if not exists bookings_expiry_idx
  on public.bookings (payment_deadline)
  where status = 'pending_payment';

-- Hold the booked seats for the full 30-minute payment window (create_booking_
-- _from_hold previously left them on the short selection hold). Only the one
-- added statement differs from the live definition.
create or replace function public.create_booking_from_hold(
  p_schedule uuid, p_hold_token text, p_contact jsonb, p_passengers jsonb,
  p_infants jsonb default '[]'::jsonb, p_promo_code text default null, p_use_referral_reward boolean default false
) returns table(booking_id uuid, reference text)
language plpgsql security definer set search_path = public as $function$
declare
  v_vendor uuid; v_fare bigint; n int; n_inf int; held int; bk uuid; ref text;
  pitem jsonb; pid uuid; st record; bpid uuid; seatfare bigint; base bigint;
  ptype public.passenger_type; total bigint := 0;
  v_uid uuid := auth.uid();
  v_promo uuid; v_reward uuid; v_discount bigint := 0; v_reason text;
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
  values (ref, v_vendor, p_schedule, p_contact->>'name', p_contact->>'phone', p_contact->>'email', n + n_inf, 0, 0, 'pending_payment', v_uid, p_hold_token) returning id into bk;
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
  -- Extend the booked seats' hold to the 30-minute payment window.
  update public.schedule_seats set held_until = now() + interval '30 minutes'
    where schedule_id = p_schedule and hold_token = p_hold_token and state = 'held';
  for pitem in select jsonb_array_elements(p_infants) loop
    insert into public.passengers (booking_id, full_name, phone, email) values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, null, null, 0, 'child_1_5');
  end loop;
  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select promo_id, discount_kobo, reason into v_promo, v_discount, v_reason
      from public.promo_quote(p_promo_code, total, v_uid);
    if v_reason is not null then raise exception 'PROMO:%', v_reason; end if;
  elsif p_use_referral_reward and v_uid is not null then
    select reward_id, discount_kobo into v_reward, v_discount
      from public.referral_reward_quote(v_uid, total);
    if v_reward is null then v_discount := 0; end if;
  end if;
  if v_discount > total then v_discount := total; end if;
  update public.bookings
    set total_fare_kobo = total, discount_kobo = v_discount, grand_total_kobo = total - v_discount,
        promo_code_id = v_promo, referral_reward_id = v_reward
    where id = bk;
  insert into public.booking_status_history (booking_id, to_status, note) values (bk, 'pending_payment', 'created from hold');
  return query select bk, ref;
end;
$function$;

-- Cancel every unpaid booking past its deadline; release its seats. Idempotent.
create or replace function public.expire_overdue_bookings() returns int
language plpgsql security definer set search_path = public as $$
declare b record; cnt int := 0;
begin
  for b in
    select id from public.bookings
    where status = 'pending_payment' and payment_deadline < now()
    for update skip locked
  loop
    update public.schedule_seats
      set state = 'available', held_until = null, hold_token = null, booking_passenger_id = null
      where booking_passenger_id in (select id from public.booking_passengers where booking_id = b.id);
    update public.bookings set status = 'expired' where id = b.id;
    insert into public.booking_status_history (booking_id, from_status, to_status, note)
      values (b.id, 'pending_payment', 'expired', 'auto-expired: payment not completed within 30 minutes');
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;
revoke all on function public.expire_overdue_bookings() from public, anon;
grant execute on function public.expire_overdue_bookings() to authenticated, service_role;

-- Run the sweep every minute via pg_cron (where available). Guarded so local
-- validation (no pg_cron) skips it; the app also sweeps lazily on booking reads.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    begin
      perform cron.unschedule('expire-overdue-bookings');
    exception when others then null;
    end;
    perform cron.schedule('expire-overdue-bookings', '* * * * *', 'select public.expire_overdue_bookings();');
  end if;
end $$;

notify pgrst, 'reload schema';
