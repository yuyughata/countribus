-- ===========================================================================
-- Phase 1 — Vendors & staff (tenancy), membership helpers, RLS.
-- ===========================================================================

-- Enums --------------------------------------------------------------------
create type public.vendor_status as enum ('pending', 'approved', 'suspended', 'rejected');

create type public.vendor_role as enum (
  'vendor_owner',
  'vendor_manager',
  'booking_officer',
  'terminal_staff',
  'luggage_officer',
  'finance_officer'
);

-- vendors ------------------------------------------------------------------
create table public.vendors (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  status              public.vendor_status not null default 'pending',
  contact_email       text,
  contact_phone       text,
  logo_path           text,
  commission_rate_bps int check (commission_rate_bps is null
                                 or commission_rate_bps between 0 and 10000),
  created_by          uuid references auth.users (id),
  approved_by         uuid references auth.users (id),
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

-- vendor_staff (membership + role) -----------------------------------------
create table public.vendor_staff (
  id                   uuid primary key default gen_random_uuid(),
  vendor_id            uuid not null references public.vendors (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  role                 public.vendor_role not null,
  assigned_terminal_id uuid, -- FK to terminals added in Phase 2
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (vendor_id, user_id)
);

create index vendor_staff_user_active_idx on public.vendor_staff (user_id) where is_active;

create trigger vendor_staff_set_updated_at
  before update on public.vendor_staff
  for each row execute function public.set_updated_at();

-- Membership helpers (security definer → read without RLS, avoid recursion) --
create or replace function public.current_vendor_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select vendor_id from public.vendor_staff
  where user_id = auth.uid() and is_active;
$$;

create or replace function public.has_vendor_role(
  p_vendor uuid,
  p_roles  public.vendor_role[]
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendor_staff
    where user_id = auth.uid()
      and vendor_id = p_vendor
      and is_active
      and role = any (p_roles)
  );
$$;

-- Does the current user own (created) this vendor? Definer so it can see a
-- still-pending vendor that RLS would otherwise hide during owner bootstrap.
create or replace function public.is_vendor_creator(p_vendor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendors where id = p_vendor and created_by = auth.uid()
  );
$$;

-- Guard: only platform admin may change status / commission / approval fields.
create or replace function public.guard_vendor_admin_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  if (new.status            is distinct from old.status
      or new.commission_rate_bps is distinct from old.commission_rate_bps
      or new.approved_by    is distinct from old.approved_by
      or new.approved_at    is distinct from old.approved_at)
     and not public.is_platform_admin()
     and current_user <> 'service_role' then
    raise exception 'only platform admin may change vendor status/commission/approval';
  end if;
  return new;
end;
$$;

create trigger vendors_guard_admin_fields
  before update on public.vendors
  for each row execute function public.guard_vendor_admin_fields();

-- Guard: only an owner / platform admin / the vendor creator (bootstrap) may
-- assign the vendor_owner role — a manager cannot mint owners.
-- SECURITY INVOKER so current_user reflects the caller; vendor ownership is
-- read via the definer helper is_vendor_creator() to avoid RLS blind spots.
create or replace function public.guard_vendor_staff_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role = 'vendor_owner' then
    if not (
         public.is_platform_admin()
      or public.has_vendor_role(new.vendor_id, array['vendor_owner']::public.vendor_role[])
      or (new.user_id = auth.uid() and public.is_vendor_creator(new.vendor_id))
      or current_user = 'service_role'
    ) then
      raise exception 'only an owner or platform admin may assign the vendor_owner role';
    end if;
  end if;
  return new;
end;
$$;

create trigger vendor_staff_guard_owner
  before insert or update on public.vendor_staff
  for each row execute function public.guard_vendor_staff_owner();

-- Grants -------------------------------------------------------------------
grant select on public.vendors to anon, authenticated;
grant insert, update on public.vendors to authenticated;
grant select, insert, update, delete on public.vendor_staff to authenticated;
grant all on public.vendors, public.vendor_staff to service_role;

-- RLS: vendors -------------------------------------------------------------
alter table public.vendors enable row level security;

-- Public marketplace sees approved vendors only.
create policy vendors_select_public_approved on public.vendors
  for select using (status = 'approved');

-- Members (any role) and platform admins see their vendor regardless of status.
create policy vendors_select_member on public.vendors
  for select to authenticated
  using (id in (select public.current_vendor_ids()) or public.is_platform_admin());

-- Authenticated users may submit a vendor application (pending, owned by them).
create policy vendors_insert_application on public.vendors
  for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

-- Owners edit their vendor; the guard trigger still blocks admin-only fields.
create policy vendors_update_owner_or_admin on public.vendors
  for update to authenticated
  using (
    public.has_vendor_role(id, array['vendor_owner']::public.vendor_role[])
    or public.is_platform_admin()
  )
  with check (
    public.has_vendor_role(id, array['vendor_owner']::public.vendor_role[])
    or public.is_platform_admin()
  );

-- RLS: vendor_staff --------------------------------------------------------
alter table public.vendor_staff enable row level security;

create policy vendor_staff_select on public.vendor_staff
  for select to authenticated
  using (
    user_id = auth.uid()
    or vendor_id in (select public.current_vendor_ids())
    or public.is_platform_admin()
  );

-- Insert: owners/managers add staff; a creator can bootstrap themselves as owner.
create policy vendor_staff_insert on public.vendor_staff
  for insert to authenticated
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner', 'vendor_manager']::public.vendor_role[])
    or (
      user_id = auth.uid()
      and role = 'vendor_owner'
      and public.is_vendor_creator(vendor_id)
    )
  );

create policy vendor_staff_update on public.vendor_staff
  for update to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner', 'vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner', 'vendor_manager']::public.vendor_role[])
  );

create policy vendor_staff_delete on public.vendor_staff
  for delete to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner', 'vendor_manager']::public.vendor_role[])
  );
