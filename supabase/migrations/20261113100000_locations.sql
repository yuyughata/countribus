-- ===========================================================================
-- Phase 2 — Locations: states, cities, terminals, aliases (+ RLS + seed data).
-- ===========================================================================
-- Reference data (states, cities) is publicly readable; terminals are publicly
-- readable when active (for journey search) and managed by the owning vendor or
-- a platform admin.

create table public.states (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.cities (
  id         uuid primary key default gen_random_uuid(),
  state_id   uuid not null references public.states (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (state_id, name)
);
create index cities_state_idx on public.cities (state_id);
create index cities_name_trgm_idx on public.cities (lower(name));

create table public.terminals (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid references public.vendors (id) on delete cascade, -- null = platform terminal
  city_id    uuid not null references public.cities (id) on delete restrict,
  name       text not null,
  address    text,
  latitude   double precision,
  longitude  double precision,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index terminals_city_idx on public.terminals (city_id) where is_active;
create index terminals_vendor_idx on public.terminals (vendor_id);

create trigger terminals_set_updated_at
  before update on public.terminals
  for each row execute function public.set_updated_at();

create table public.location_aliases (
  id          uuid primary key default gen_random_uuid(),
  terminal_id uuid references public.terminals (id) on delete cascade,
  city_id     uuid references public.cities (id) on delete cascade,
  alias       text not null,
  created_at  timestamptz not null default now(),
  check (terminal_id is not null or city_id is not null)
);
create index location_aliases_alias_idx on public.location_aliases (lower(alias));

-- Grants ------------------------------------------------------------------
grant select on public.states, public.cities, public.terminals, public.location_aliases
  to anon, authenticated;
grant insert, update, delete on public.terminals to authenticated;
grant all on public.states, public.cities, public.terminals, public.location_aliases
  to service_role;

-- RLS ---------------------------------------------------------------------
alter table public.states enable row level security;
alter table public.cities enable row level security;
alter table public.terminals enable row level security;
alter table public.location_aliases enable row level security;

-- Reference data: readable by everyone; writable by platform admins only.
create policy states_read on public.states for select using (true);
create policy states_admin_write on public.states for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy cities_read on public.cities for select using (true);
create policy cities_admin_write on public.cities for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy aliases_read on public.location_aliases for select using (true);
create policy aliases_admin_write on public.location_aliases for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Terminals: active ones publicly visible; members/admins see all of theirs;
-- managed by the owning vendor's owner/manager, or a platform admin.
create policy terminals_read_public on public.terminals
  for select using (is_active);
create policy terminals_read_member on public.terminals
  for select to authenticated
  using (
    public.is_platform_admin()
    or (vendor_id is not null and vendor_id in (select public.current_vendor_ids()))
  );
create policy terminals_write on public.terminals
  for all to authenticated
  using (
    public.is_platform_admin()
    or (vendor_id is not null
        and public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]))
  )
  with check (
    public.is_platform_admin()
    or (vendor_id is not null
        and public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]))
  );

-- Seed: Nigeria's 36 states + FCT -----------------------------------------
insert into public.states (code, name) values
  ('AB','Abia'),('AD','Adamawa'),('AK','Akwa Ibom'),('AN','Anambra'),('BA','Bauchi'),
  ('BY','Bayelsa'),('BE','Benue'),('BO','Borno'),('CR','Cross River'),('DE','Delta'),
  ('EB','Ebonyi'),('ED','Edo'),('EK','Ekiti'),('EN','Enugu'),('FC','Federal Capital Territory'),
  ('GO','Gombe'),('IM','Imo'),('JI','Jigawa'),('KD','Kaduna'),('KN','Kano'),
  ('KT','Katsina'),('KE','Kebbi'),('KO','Kogi'),('KW','Kwara'),('LA','Lagos'),
  ('NA','Nasarawa'),('NI','Niger'),('OG','Ogun'),('ON','Ondo'),('OS','Osun'),
  ('OY','Oyo'),('PL','Plateau'),('RI','Rivers'),('SO','Sokoto'),('TA','Taraba'),
  ('YO','Yobe'),('ZA','Zamfara')
on conflict (code) do nothing;

-- Seed: major cities + a platform terminal in each (searchable out of the box).
insert into public.cities (state_id, name)
select s.id, v.city
from (values
  ('LA','Lagos'),('FC','Abuja'),('KN','Kano'),('RI','Port Harcourt'),('OY','Ibadan'),
  ('ED','Benin City'),('EN','Enugu'),('AN','Onitsha'),('KD','Kaduna'),('PL','Jos'),
  ('IM','Owerri'),('AK','Uyo'),('DE','Warri'),('OG','Abeokuta'),('BO','Maiduguri')
) as v(code, city)
join public.states s on s.code = v.code
on conflict (state_id, name) do nothing;

insert into public.terminals (city_id, name, address)
select ci.id, v.terminal, v.addr
from (values
  ('LA','Lagos','Jibowu Terminal','Jibowu, Yaba, Lagos'),
  ('FC','Abuja','Utako Motor Park','Utako, Abuja'),
  ('KN','Kano','Naibawa Motor Park','Zaria Road, Kano'),
  ('RI','Port Harcourt','Waterlines Terminal','Aba Road, Port Harcourt'),
  ('OY','Ibadan','Iwo Road Terminal','Iwo Road, Ibadan'),
  ('ED','Benin City','Uselu Terminal','Uselu, Benin City'),
  ('EN','Enugu','Holy Ghost Terminal','Ogui Road, Enugu'),
  ('AN','Onitsha','Upper Iweka Terminal','Upper Iweka, Onitsha'),
  ('KD','Kaduna','Kawo Motor Park','Kawo, Kaduna'),
  ('PL','Jos','Bauchi Ring Road Park','Bauchi Road, Jos'),
  ('IM','Owerri','Control Post Terminal','Wetheral Road, Owerri'),
  ('AK','Uyo','Itam Motor Park','Itam, Uyo'),
  ('DE','Warri','Enerhen Junction Park','Enerhen, Warri'),
  ('OG','Abeokuta','Kuto Terminal','Kuto, Abeokuta'),
  ('BO','Maiduguri','Baga Road Motor Park','Baga Road, Maiduguri')
) as v(code, city, terminal, addr)
join public.states s on s.code = v.code
join public.cities ci on ci.state_id = s.id and ci.name = v.city;
