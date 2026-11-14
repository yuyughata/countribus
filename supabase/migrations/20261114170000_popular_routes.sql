-- ===========================================================================
-- list_popular_routes — one card per route for the homepage "Popular Routes"
-- slider. "Frequently travelled" is approximated by how many upcoming published
-- departures a corridor has; for each route we surface the SOONEST upcoming
-- departure that still has seats, so every card is directly bookable.
-- Security definer: same published inventory + live seat counts as search.
-- ===========================================================================
create or replace function public.list_popular_routes(p_limit int default 8)
returns table (
  schedule_id uuid,
  vendor_name text,
  origin_city text,
  destination_city text,
  origin_terminal text,
  destination_terminal text,
  departure_at timestamptz,
  base_fare_kobo bigint,
  available_seats int,
  frequency int
)
language sql stable security definer set search_path = public as $$
  with upcoming as (
    select
      s.id, s.vendor_id, s.origin_terminal_id, s.destination_terminal_id,
      s.departure_at, s.base_fare_kobo,
      (select count(*)::int from public.schedule_seats ss
        where ss.schedule_id = s.id
          and (ss.state = 'available' or (ss.state = 'held' and ss.held_until < now()))) as seats
    from public.schedules s
    join public.vendors v on v.id = s.vendor_id and v.status = 'approved'
    where s.status = 'published'
      and s.departure_at > now()
      and (s.booking_cutoff_at is null or s.booking_cutoff_at > now())
  ),
  bookable as (
    select * from upcoming where seats >= 1
  ),
  freq as (
    select origin_terminal_id, destination_terminal_id, count(*) as frequency
    from bookable group by 1, 2
  ),
  soonest as (
    select distinct on (b.origin_terminal_id, b.destination_terminal_id)
      b.id, b.vendor_id, b.origin_terminal_id, b.destination_terminal_id,
      b.departure_at, b.base_fare_kobo, b.seats
    from bookable b
    order by b.origin_terminal_id, b.destination_terminal_id, b.departure_at
  )
  select
    so.id, v.name, oc.name, dc.name, ot.name, dt.name,
    so.departure_at, so.base_fare_kobo, so.seats, f.frequency
  from soonest so
  join freq f on f.origin_terminal_id = so.origin_terminal_id
             and f.destination_terminal_id = so.destination_terminal_id
  join public.vendors v on v.id = so.vendor_id
  join public.terminals ot on ot.id = so.origin_terminal_id
  join public.terminals dt on dt.id = so.destination_terminal_id
  join public.cities oc on oc.id = ot.city_id
  join public.cities dc on dc.id = dt.city_id
  order by f.frequency desc, so.departure_at
  limit greatest(p_limit, 1);
$$;
revoke all on function public.list_popular_routes(int) from public;
grant execute on function public.list_popular_routes(int) to anon, authenticated, service_role;
