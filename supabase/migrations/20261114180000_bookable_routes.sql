-- ===========================================================================
-- list_bookable_routes — the (origin, destination) pairs a customer can
-- actually book right now: routes with at least one upcoming published
-- departure that still has available seats. The trip-finder uses this to
-- populate its From/To pickers, so a customer can only choose routes that
-- return results (no dead-end searches). Security definer: same published
-- inventory + live seat counts as search.
-- ===========================================================================
create or replace function public.list_bookable_routes()
returns table (
  origin_id uuid,
  origin_label text,
  dest_id uuid,
  dest_label text
)
language sql stable security definer set search_path = public as $$
  select distinct
    ot.id, ot.name || ' — ' || oc.name,
    dt.id, dt.name || ' — ' || dc.name
  from public.schedules s
  join public.vendors v on v.id = s.vendor_id and v.status = 'approved'
  join public.terminals ot on ot.id = s.origin_terminal_id
  join public.terminals dt on dt.id = s.destination_terminal_id
  join public.cities oc on oc.id = ot.city_id
  join public.cities dc on dc.id = dt.city_id
  where s.status = 'published'
    and s.departure_at > now()
    and (s.booking_cutoff_at is null or s.booking_cutoff_at > now())
    and (
      select count(*) from public.schedule_seats ss
      where ss.schedule_id = s.id
        and (ss.state = 'available' or (ss.state = 'held' and ss.held_until < now()))
    ) >= 1
  order by 2, 4;
$$;
revoke all on function public.list_bookable_routes() from public;
grant execute on function public.list_bookable_routes() to anon, authenticated, service_role;
