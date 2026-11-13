-- ===========================================================================
-- Seat configuration upgrade (part 2): seat classes + per-seat surcharges.
-- Surcharge snapshots into inventory at publish and flows into booking price.
-- ===========================================================================

alter table public.seat_template_seats
  add column if not exists seat_class text not null default 'standard',
  add column if not exists surcharge_kobo bigint not null default 0 check (surcharge_kobo >= 0);
alter table public.schedule_seats
  add column if not exists surcharge_kobo bigint not null default 0;

-- publish_schedule now snapshots each seat's surcharge into inventory.
create or replace function public.publish_schedule(p_schedule uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.schedules; tpl public.seat_templates; seatcount int;
begin
  select * into s from public.schedules where id = p_schedule for update;
  if s.id is null then raise exception 'schedule not found'; end if;
  if not (public.is_platform_admin() or public.has_vendor_role(s.vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])) then
    raise exception 'not authorized to publish this schedule';
  end if;
  if s.status <> 'draft' then raise exception 'only draft schedules can be published'; end if;
  if s.vehicle_id is null then raise exception 'assign a vehicle before publishing'; end if;
  if s.arrival_estimate_at is null then raise exception 'set an arrival estimate before publishing'; end if;
  if coalesce(s.base_fare_kobo, 0) <= 0 then raise exception 'set a fare before publishing'; end if;
  select * into tpl from public.seat_templates where vehicle_id = s.vehicle_id and is_published order by version desc limit 1;
  if tpl.id is null then raise exception 'the assigned vehicle has no published seat layout'; end if;
  select count(*) into seatcount from public.seat_template_seats where seat_template_id = tpl.id and is_sellable;
  if seatcount = 0 then raise exception 'the seat layout has no sellable seats'; end if;
  update public.schedules set seat_template_id = tpl.id, seat_template_version = tpl.version, capacity = seatcount, status = 'published' where id = p_schedule;
  insert into public.schedule_seats (schedule_id, seat_label, seat_id, state, surcharge_kobo)
  select p_schedule, st.seat_label, st.id::text, 'available', st.surcharge_kobo
  from public.seat_template_seats st where st.seat_template_id = tpl.id and st.is_sellable;
end;
$$;
revoke all on function public.publish_schedule(uuid) from public, anon;
grant execute on function public.publish_schedule(uuid) to authenticated, service_role;

-- create_booking_from_hold now prices each seat as base fare + seat surcharge.
create or replace function public.create_booking_from_hold(p_schedule uuid, p_hold_token text, p_contact jsonb, p_passengers jsonb)
returns table (booking_id uuid, reference text)
language plpgsql security definer set search_path = public as $$
declare v_vendor uuid; v_fare bigint; n int; held int; bk uuid; ref text; pitem jsonb; pid uuid; st record; bpid uuid; seatfare bigint; total bigint := 0;
begin
  select vendor_id, base_fare_kobo into v_vendor, v_fare from public.schedules where id = p_schedule and status = 'published';
  if v_vendor is null then raise exception 'schedule is not open for booking'; end if;
  n := coalesce(jsonb_array_length(p_passengers), 0);
  if n = 0 then raise exception 'no passengers supplied'; end if;
  perform public.reconcile_expired_holds(p_schedule);
  select count(*) into held from public.schedule_seats where schedule_id = p_schedule and hold_token = p_hold_token and state = 'held';
  if held <> n then raise exception 'your seat hold has expired — please reselect your seats'; end if;
  ref := 'CB-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.bookings (reference, vendor_id, schedule_id, contact_name, contact_phone, contact_email, passenger_count, total_fare_kobo, grand_total_kobo, status, created_by, hold_token)
  values (ref, v_vendor, p_schedule, p_contact->>'name', p_contact->>'phone', p_contact->>'email', n, 0, 0, 'pending_payment', auth.uid(), p_hold_token) returning id into bk;
  for pitem in select jsonb_array_elements(p_passengers) loop
    select * into st from public.schedule_seats where schedule_id = p_schedule and seat_id = (pitem->>'seat_id') and hold_token = p_hold_token and state = 'held';
    if st.seat_id is null then raise exception 'a selected seat is no longer held'; end if;
    seatfare := v_fare + coalesce(st.surcharge_kobo, 0);
    total := total + seatfare;
    insert into public.passengers (booking_id, full_name, phone, email) values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo) values (bk, pid, p_schedule, st.seat_id, st.seat_label, seatfare) returning id into bpid;
    update public.schedule_seats set booking_passenger_id = bpid where schedule_id = p_schedule and seat_id = st.seat_id;
  end loop;
  update public.bookings set total_fare_kobo = total, grand_total_kobo = total where id = bk;
  insert into public.booking_status_history (booking_id, to_status, note) values (bk, 'pending_payment', 'created from hold');
  return query select bk, ref;
end;
$$;
revoke all on function public.create_booking_from_hold(uuid, text, jsonb, jsonb) from public;
grant execute on function public.create_booking_from_hold(uuid, text, jsonb, jsonb) to anon, authenticated, service_role;
