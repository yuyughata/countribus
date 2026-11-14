-- ===========================================================================
-- search_alternative_journeys — "Other routes" shown below the exact results.
--
-- Returns upcoming, bookable, available departures from the SAME origin
-- terminal, excluding the exact (origin, destination, date) the customer
-- searched (those are already shown above). Same-destination departures on
-- other dates/times come first (direct alternatives to their trip), then other
-- destinations from the same origin (nearby options). Security definer so it can
-- read the same published inventory and live seat counts as search_journeys.
-- ===========================================================================
create or replace function public.search_alternative_journeys(
  p_origin uuid,
  p_dest uuid,
  p_date date,
  p_pax int default 1,
  p_limit int default 8
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
  select q.schedule_id, q.vendor_name, q.origin_name, q.destination_name, q.departure_at,
         q.arrival_estimate_at, q.base_fare_kobo, q.category_key, q.available_seats
  from (
    select
      s.id as schedule_id,
      v.name as vendor_name,
      ot.name as origin_name,
      dt.name as destination_name,
      s.departure_at,
      s.arrival_estimate_at,
      s.base_fare_kobo,
      vc.key as category_key,
      (select count(*)::int from public.schedule_seats ss
        where ss.schedule_id = s.id
          and (ss.state = 'available' or (ss.state = 'held' and ss.held_until < now()))) as available_seats,
      (s.destination_terminal_id = p_dest) as same_dest
    from public.schedules s
    join public.vendors v on v.id = s.vendor_id and v.status = 'approved'
    join public.terminals ot on ot.id = s.origin_terminal_id
    join public.terminals dt on dt.id = s.destination_terminal_id
    left join public.vehicles veh on veh.id = s.vehicle_id
    left join public.vehicle_categories vc on vc.id = veh.category_id
    where s.status = 'published'
      and s.origin_terminal_id = p_origin
      and s.departure_at > now()
      and (s.booking_cutoff_at is null or s.booking_cutoff_at > now())
      and not (
        s.destination_terminal_id = p_dest
        and (s.departure_at at time zone 'Africa/Lagos')::date = p_date
      )
  ) q
  where q.available_seats >= greatest(p_pax, 1)
  order by q.same_dest desc, q.departure_at
  limit greatest(p_limit, 1);
$$;
revoke all on function public.search_alternative_journeys(uuid, uuid, date, int, int) from public;
grant execute on function public.search_alternative_journeys(uuid, uuid, date, int, int) to anon, authenticated, service_role;
