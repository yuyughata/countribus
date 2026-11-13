-- ===========================================================================
-- Phase 4 — Journey search + concurrency-safe seat holds.
-- ===========================================================================
-- Invariants (plan §6/§7): seat holds expire automatically; hold creation and
-- conversion are atomic and concurrency-safe. The partial unique index from
-- Phase 3 is the backstop; the atomic UPDATE ... WHERE state='available' is the
-- primary mechanism (row locks make concurrent holds of the same seat serialise,
-- and the loser sees 0 rows).

alter table public.schedule_seats add column hold_token text;
create index schedule_seats_hold_idx on public.schedule_seats (schedule_id, hold_token)
  where hold_token is not null;

-- Free seats whose hold has lapsed. Returns how many were reclaimed.
create or replace function public.reconcile_expired_holds(p_schedule uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.schedule_seats
    set state = 'available', hold_token = null, held_until = null, booking_passenger_id = null
    where schedule_id = p_schedule and state = 'held'
      and held_until is not null and held_until < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.reconcile_expired_holds(uuid) from public;
grant execute on function public.reconcile_expired_holds(uuid) to anon, authenticated, service_role;

-- Atomically hold seats for a checkout session (all-or-nothing). Returns expiry.
create or replace function public.hold_seats(
  p_schedule uuid,
  p_seat_ids text[],
  p_hold_token text,
  p_minutes int default 10
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare cnt int; want int; expiry timestamptz;
begin
  want := coalesce(array_length(p_seat_ids, 1), 0);
  if want = 0 then raise exception 'no seats requested'; end if;
  if want > 10 then raise exception 'cannot hold more than 10 seats at once'; end if;
  if not public.schedule_public(p_schedule) then raise exception 'schedule is not open for booking'; end if;

  perform public.reconcile_expired_holds(p_schedule);
  expiry := now() + make_interval(mins => p_minutes);

  update public.schedule_seats
    set state = 'held', held_until = expiry, hold_token = p_hold_token
    where schedule_id = p_schedule and seat_id = any(p_seat_ids) and state = 'available';
  get diagnostics cnt = row_count;

  if cnt <> want then
    raise exception 'one or more selected seats are no longer available';
  end if;
  return expiry;
end;
$$;
revoke all on function public.hold_seats(uuid, text[], text, int) from public;
grant execute on function public.hold_seats(uuid, text[], text, int) to anon, authenticated, service_role;

-- Release an active hold (e.g. user abandons checkout).
create or replace function public.release_hold(p_schedule uuid, p_hold_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.schedule_seats
    set state = 'available', held_until = null, hold_token = null
    where schedule_id = p_schedule and hold_token = p_hold_token and state = 'held';
end;
$$;
revoke all on function public.release_hold(uuid, text) from public;
grant execute on function public.release_hold(uuid, text) to anon, authenticated, service_role;

-- Journey search: published schedules of approved vendors with enough seats.
-- SECURITY DEFINER with the visibility filter hardcoded; callable by anyone.
create or replace function public.search_journeys(
  p_origin uuid,
  p_dest uuid,
  p_date date,
  p_pax int default 1,
  p_category text default null
) returns table (
  schedule_id uuid,
  vendor_name text,
  origin_name text,
  destination_name text,
  departure_at timestamptz,
  arrival_estimate_at timestamptz,
  base_fare_kobo bigint,
  category_key text,
  available_seats int
)
language sql stable security definer set search_path = public as $$
  select * from (
    select
      s.id,
      v.name,
      ot.name,
      dt.name,
      s.departure_at,
      s.arrival_estimate_at,
      s.base_fare_kobo,
      vc.key,
      (select count(*)::int from public.schedule_seats ss
        where ss.schedule_id = s.id
          and (ss.state = 'available' or (ss.state = 'held' and ss.held_until < now())))
    from public.schedules s
    join public.vendors v on v.id = s.vendor_id and v.status = 'approved'
    join public.terminals ot on ot.id = s.origin_terminal_id
    join public.terminals dt on dt.id = s.destination_terminal_id
    left join public.vehicles veh on veh.id = s.vehicle_id
    left join public.vehicle_categories vc on vc.id = veh.category_id
    where s.status = 'published'
      and s.origin_terminal_id = p_origin
      and s.destination_terminal_id = p_dest
      and (s.departure_at at time zone 'Africa/Lagos')::date = p_date
      and (p_category is null or vc.key = p_category)
      and (s.booking_cutoff_at is null or s.booking_cutoff_at > now())
  ) q(schedule_id, vendor_name, origin_name, destination_name, departure_at,
      arrival_estimate_at, base_fare_kobo, category_key, available_seats)
  where q.available_seats >= greatest(p_pax, 1)
  order by q.departure_at;
$$;
revoke all on function public.search_journeys(uuid, uuid, date, int, text) from public;
grant execute on function public.search_journeys(uuid, uuid, date, int, text) to anon, authenticated, service_role;
