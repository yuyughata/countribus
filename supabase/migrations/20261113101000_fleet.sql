-- ===========================================================================
-- Phase 2 — Fleet: categories, vehicles, versioned seat templates (+ RLS).
-- ===========================================================================
-- CRITICAL (plan §3): vehicle + seat-template management is restricted to
-- super_admin / vendor_owner / vendor_manager. Enforced here in RLS and in
-- lib/permissions (server) and tested both ways.

-- Vehicle categories (reference data) -------------------------------------
create table public.vehicle_categories (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0
);

insert into public.vehicle_categories (key, name, description, sort_order) values
  ('eighteen_seater','18-Seater Bus','Compact intercity bus (e.g. Toyota Hiace)',1),
  ('coaster','Coaster','Mid-size coach seating ~30 passengers',2),
  ('luxury_coach','Luxury Coach','Full-size air-conditioned luxury coach',3)
on conflict (key) do nothing;

-- Vehicles ----------------------------------------------------------------
create type public.vehicle_status as enum ('active', 'inactive', 'maintenance');

create table public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid not null references public.vendors (id) on delete cascade,
  category_id     uuid not null references public.vehicle_categories (id) on delete restrict,
  registration_no text not null,
  display_name    text,
  capacity        int not null check (capacity > 0 and capacity <= 100),
  status          public.vehicle_status not null default 'active',
  photos          text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (vendor_id, registration_no)
);
create index vehicles_vendor_idx on public.vehicles (vendor_id);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- Seat templates (versioned layouts) --------------------------------------
create table public.seat_templates (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete cascade,
  name         text not null,
  version      int not null default 1,
  rows         int not null check (rows between 1 and 40),
  columns      int not null check (columns between 1 and 10),
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index seat_templates_vendor_idx on public.seat_templates (vendor_id);
create index seat_templates_vehicle_idx on public.seat_templates (vehicle_id);
create unique index seat_templates_vehicle_version_idx
  on public.seat_templates (vehicle_id, version) where vehicle_id is not null;

create trigger seat_templates_set_updated_at
  before update on public.seat_templates
  for each row execute function public.set_updated_at();

create type public.seat_type as enum ('standard', 'window', 'aisle', 'driver', 'blocked');

create table public.seat_template_seats (
  id               uuid primary key default gen_random_uuid(),
  seat_template_id uuid not null references public.seat_templates (id) on delete cascade,
  seat_label       text not null,
  row              int not null check (row >= 1),
  col              int not null check (col >= 1),
  seat_type        public.seat_type not null default 'standard',
  is_sellable      boolean not null default true,
  unique (seat_template_id, seat_label)
);
create index seat_template_seats_template_idx on public.seat_template_seats (seat_template_id);

-- Vendor of a template (definer → used in child-table policies without RLS blind spots).
create or replace function public.seat_template_vendor(p_template uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select vendor_id from public.seat_templates where id = p_template;
$$;
revoke all on function public.seat_template_vendor(uuid) from public, anon;
grant execute on function public.seat_template_vendor(uuid) to authenticated, service_role;

-- Publish-freeze: a published template's seats/structure cannot be mutated, and
-- a published template cannot be un-published. Create a new version instead.
create or replace function public.guard_published_template() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'seat_templates' then
    if tg_op = 'UPDATE' and old.is_published
       and (new.rows <> old.rows or new.columns <> old.columns or new.is_published = false) then
      raise exception 'a published seat template is frozen; create a new version';
    end if;
  else -- seat_template_seats
    if (select is_published from public.seat_templates
        where id = coalesce(new.seat_template_id, old.seat_template_id)) then
      raise exception 'cannot modify seats of a published template; create a new version';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger seat_templates_guard_published
  before update on public.seat_templates
  for each row execute function public.guard_published_template();
create trigger seat_template_seats_guard_published
  before insert or update or delete on public.seat_template_seats
  for each row execute function public.guard_published_template();

-- Grants ------------------------------------------------------------------
grant select on public.vehicle_categories to anon, authenticated;
grant all on public.vehicle_categories to service_role;
grant select, insert, update, delete on public.vehicles, public.seat_templates, public.seat_template_seats
  to authenticated;
grant all on public.vehicles, public.seat_templates, public.seat_template_seats to service_role;

-- RLS: categories (public read, admin write) ------------------------------
alter table public.vehicle_categories enable row level security;
create policy vehicle_categories_read on public.vehicle_categories for select using (true);
create policy vehicle_categories_admin_write on public.vehicle_categories for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Helper: may the current user manage fleet for this vendor?
-- (super_admin via is_platform_admin, or vendor_owner/vendor_manager)
-- RLS: vehicles --------------------------------------------------------------
alter table public.vehicles enable row level security;

create policy vehicles_select on public.vehicles
  for select to authenticated
  using (vendor_id in (select public.current_vendor_ids()) or public.is_platform_admin());

create policy vehicles_manage on public.vehicles
  for all to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  );

-- RLS: seat_templates --------------------------------------------------------
alter table public.seat_templates enable row level security;

create policy seat_templates_select on public.seat_templates
  for select to authenticated
  using (vendor_id in (select public.current_vendor_ids()) or public.is_platform_admin());

create policy seat_templates_manage on public.seat_templates
  for all to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  );

-- RLS: seat_template_seats (scoped via parent template's vendor) -------------
alter table public.seat_template_seats enable row level security;

create policy seat_template_seats_select on public.seat_template_seats
  for select to authenticated
  using (
    public.is_platform_admin()
    or public.seat_template_vendor(seat_template_id) in (select public.current_vendor_ids())
  );

create policy seat_template_seats_manage on public.seat_template_seats
  for all to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(public.seat_template_vendor(seat_template_id),
                              array['vendor_owner','vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(public.seat_template_vendor(seat_template_id),
                              array['vendor_owner','vendor_manager']::public.vendor_role[])
  );
