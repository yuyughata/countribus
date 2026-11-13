-- ===========================================================================
-- Phase 1 — Identity core: profiles, platform-admin flag, shared helpers.
-- ===========================================================================
-- Depends on the Supabase-managed `auth` schema (auth.users, auth.uid()).

create extension if not exists pgcrypto;

-- Shared updated_at trigger ------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles (1:1 with auth.users) -------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  phone             text,
  email             text,
  avatar_path       text,
  is_platform_admin boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when an auth user is created.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent self-escalation to platform admin. Only an existing platform admin
-- (or the service role) may flip the flag.
-- SECURITY INVOKER so current_user reflects the real caller (service_role vs
-- authenticated); is_platform_admin() is itself definer and works regardless.
create or replace function public.guard_profile_admin_flag() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_platform_admin is distinct from old.is_platform_admin then
    if not public.is_platform_admin() and current_user <> 'service_role' then
      raise exception 'not authorized to change platform admin flag';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_flag
  before update on public.profiles
  for each row execute function public.guard_profile_admin_flag();

-- Platform admin check (security definer to avoid RLS recursion) ------------
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_platform_admin
  );
$$;

-- Grants + RLS -------------------------------------------------------------
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
