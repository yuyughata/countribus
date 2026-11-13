-- ===========================================================================
-- Phase 3 — Routes & schedules + seat inventory generation.
-- ===========================================================================
-- Invariants (plan §6):
--  * A vehicle cannot be assigned to overlapping trips / impossible turnaround
--    → enforced by a GiST exclusion constraint on (vehicle_id, service_window).
--  * A published schedule snapshots the exact seat-layout version it used
--    → publish_schedule() copies seat_template_version and generates inventory.

create extension if not exists btree_gist;

-- Routes (vendor-defined, reusable) ---------------------------------------
create table public.routes (
  id                     uuid primary key default gen_random_uuid(),
  vendor_id              uuid not null references public.vendors (id) on delete cascade,
  origin_terminal_id     uuid not null references public.terminals (id) on delete restrict,
  destination_terminal_id uuid not null references public.terminals (id) on delete restrict,
  name                   text not null,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (origin_terminal_id <> destination_terminal_id)
);
create index routes_vendor_idx on public.routes (vendor_id);
create trigger routes_set_updated_at before update on public.routes
  for each row execute function public.set_updated_at();

create table public.route_stops (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid not null references public.routes (id) on delete cascade,
  terminal_id uuid not null references public.terminals (id) on delete restrict,
  stop_order  int not null,
  is_pickup   boolean not null default true,
  is_dropoff  boolean not null default true,
  unique (route_id, stop_order)
);

-- Schedules (concrete departures) -----------------------------------------
create type public.schedule_status as enum ('draft', 'published', 'cancelled', 'departed', 'completed');

create table public.schedules (
  id                      uuid primary key default gen_random_uuid(),
  vendor_id               uuid not null references public.vendors (id) on delete cascade,
  route_id                uuid not null references public.routes (id) on delete restrict,
  vehicle_id              uuid references public.vehicles (id) on delete restrict,
  seat_template_id        uuid references public.seat_templates (id) on delete restrict,
  seat_template_version   int,                       -- snapshot, set at publish
  origin_terminal_id      uuid not null references public.terminals (id) on delete restrict,
  destination_terminal_id uuid not null references public.terminals (id) on delete restrict,
  departure_at            timestamptz not null,
  arrival_estimate_at     timestamptz,
  base_fare_kobo          bigint check (base_fare_kobo is null or base_fare_kobo >= 0),
  currency                text not null default 'NGN',
  booking_cutoff_at       timestamptz,
  capacity                int,
  status                  public.schedule_status not null default 'draft',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Service window for vehicle-overlap exclusion (60-min turnaround).
  -- Maintained by a trigger (tstzrange isn't immutable enough for a generated column).
  service_window          tstzrange,
  check (arrival_estimate_at is null or arrival_estimate_at > departure_at)
);
create index schedules_vendor_idx on public.schedules (vendor_id);
create index schedules_search_idx on public.schedules (origin_terminal_id, destination_terminal_id, departure_at)
  where status = 'published';

create or replace function public.set_schedule_window() returns trigger
language plpgsql set search_path = public as $$
begin
  new.service_window := case
    when new.arrival_estimate_at is not null
      then tstzrange(new.departure_at, new.arrival_estimate_at + interval '60 minutes')
  end;
  return new;
end;
$$;
create trigger schedules_set_window before insert or update on public.schedules
  for each row execute function public.set_schedule_window();
create trigger schedules_set_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();

-- No vehicle double-booking: overlapping service windows for the same vehicle
-- among live schedules are rejected at the database level.
alter table public.schedules add constraint schedules_no_vehicle_overlap
  exclude using gist (vehicle_id with =, service_window with &&)
  where (status in ('published', 'departed') and vehicle_id is not null);

-- Seat inventory (per schedule; snapshot, independent of template lifecycle) --
create type public.seat_state as enum ('available', 'booked', 'held', 'blocked');

create table public.schedule_seats (
  id                   uuid primary key default gen_random_uuid(),
  schedule_id          uuid not null references public.schedules (id) on delete cascade,
  seat_label           text not null,
  seat_id              text not null,  -- stable id snapshotted from the template seat
  state                public.seat_state not null default 'available',
  booking_passenger_id uuid,
  held_until           timestamptz,
  updated_at           timestamptz not null default now(),
  unique (schedule_id, seat_id)
);
-- A seat is allocated at most once per schedule for active states.
create unique index schedule_seats_active_alloc_idx
  on public.schedule_seats (schedule_id, seat_id) where state in ('booked', 'held');
create index schedule_seats_schedule_idx on public.schedule_seats (schedule_id);

create trigger schedule_seats_set_updated_at before update on public.schedule_seats
  for each row execute function public.set_updated_at();

-- Helpers ------------------------------------------------------------------
create or replace function public.schedule_vendor(p_schedule uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select vendor_id from public.schedules where id = p_schedule;
$$;
revoke all on function public.schedule_vendor(uuid) from public, anon;
grant execute on function public.schedule_vendor(uuid) to authenticated, service_role;

-- Is a schedule publicly bookable (published + vendor approved)?
create or replace function public.schedule_public(p_schedule uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.schedules s join public.vendors v on v.id = s.vendor_id
    where s.id = p_schedule and s.status = 'published' and v.status = 'approved'
  );
$$;
revoke all on function public.schedule_public(uuid) from public;
grant execute on function public.schedule_public(uuid) to anon, authenticated, service_role;

-- Publish: authorize, snapshot the seat layout, generate inventory, go live.
create or replace function public.publish_schedule(p_schedule uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.schedules; tpl public.seat_templates; seatcount int;
begin
  select * into s from public.schedules where id = p_schedule for update;
  if s.id is null then raise exception 'schedule not found'; end if;
  if not (public.is_platform_admin()
          or public.has_vendor_role(s.vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])) then
    raise exception 'not authorized to publish this schedule';
  end if;
  if s.status <> 'draft' then raise exception 'only draft schedules can be published'; end if;
  if s.vehicle_id is null then raise exception 'assign a vehicle before publishing'; end if;
  if s.arrival_estimate_at is null then raise exception 'set an arrival estimate before publishing'; end if;
  if coalesce(s.base_fare_kobo, 0) <= 0 then raise exception 'set a fare before publishing'; end if;

  select * into tpl from public.seat_templates
    where vehicle_id = s.vehicle_id and is_published
    order by version desc limit 1;
  if tpl.id is null then raise exception 'the assigned vehicle has no published seat layout'; end if;

  select count(*) into seatcount from public.seat_template_seats
    where seat_template_id = tpl.id and is_sellable;
  if seatcount = 0 then raise exception 'the seat layout has no sellable seats'; end if;

  -- Setting status='published' triggers the overlap exclusion constraint.
  update public.schedules
    set seat_template_id = tpl.id, seat_template_version = tpl.version,
        capacity = seatcount, status = 'published'
    where id = p_schedule;

  insert into public.schedule_seats (schedule_id, seat_label, seat_id, state)
  select p_schedule, st.seat_label, st.id::text, 'available'
  from public.seat_template_seats st
  where st.seat_template_id = tpl.id and st.is_sellable;
end;
$$;
revoke all on function public.publish_schedule(uuid) from public, anon;
grant execute on function public.publish_schedule(uuid) to authenticated, service_role;

-- Grants ------------------------------------------------------------------
grant select, insert, update, delete on public.routes, public.route_stops, public.schedules
  to authenticated;
grant select on public.schedules, public.schedule_seats to anon;
grant select, update on public.schedule_seats to authenticated;
grant all on public.routes, public.route_stops, public.schedules, public.schedule_seats to service_role;

-- RLS ---------------------------------------------------------------------
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_seats enable row level security;

-- Routes: members/admin read + manage (owner/manager).
create policy routes_select on public.routes for select to authenticated
  using (vendor_id in (select public.current_vendor_ids()) or public.is_platform_admin());
create policy routes_manage on public.routes for all to authenticated
  using (public.is_platform_admin() or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]))
  with check (public.is_platform_admin() or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]));

create policy route_stops_select on public.route_stops for select to authenticated
  using (public.is_platform_admin() or (select vendor_id from public.routes r where r.id = route_id) in (select public.current_vendor_ids()));
create policy route_stops_manage on public.route_stops for all to authenticated
  using (public.is_platform_admin() or public.has_vendor_role((select vendor_id from public.routes r where r.id = route_id), array['vendor_owner','vendor_manager']::public.vendor_role[]))
  with check (public.is_platform_admin() or public.has_vendor_role((select vendor_id from public.routes r where r.id = route_id), array['vendor_owner','vendor_manager']::public.vendor_role[]));

-- Schedules: public sees published+approved; members see own; manage owner/manager.
create policy schedules_select_public on public.schedules for select
  using (status = 'published' and exists (select 1 from public.vendors v where v.id = vendor_id and v.status = 'approved'));
create policy schedules_select_member on public.schedules for select to authenticated
  using (vendor_id in (select public.current_vendor_ids()) or public.is_platform_admin());
create policy schedules_manage on public.schedules for all to authenticated
  using (public.is_platform_admin() or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]))
  with check (public.is_platform_admin() or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]));

-- Schedule seats: public sees seats of public schedules (for the seat map);
-- members see own; owner/manager may block/unblock seats directly.
create policy schedule_seats_select_public on public.schedule_seats for select
  using (public.schedule_public(schedule_id));
create policy schedule_seats_select_member on public.schedule_seats for select to authenticated
  using (public.is_platform_admin() or public.schedule_vendor(schedule_id) in (select public.current_vendor_ids()));
create policy schedule_seats_manage on public.schedule_seats for update to authenticated
  using (public.is_platform_admin() or public.has_vendor_role(public.schedule_vendor(schedule_id), array['vendor_owner','vendor_manager']::public.vendor_role[]))
  with check (public.is_platform_admin() or public.has_vendor_role(public.schedule_vendor(schedule_id), array['vendor_owner','vendor_manager']::public.vendor_role[]));
