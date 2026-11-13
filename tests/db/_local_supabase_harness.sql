-- Local-only harness that emulates the Supabase-managed auth schema + roles.
-- NOT part of the repo; used only to validate migrations against local Postgres.

create extension if not exists pgcrypto;

-- Supabase roles
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

-- auth schema stubs
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- auth.uid()/auth.role() read the JWT claims GUC like Supabase, but tolerate an
-- empty/unset/invalid value (returns null) the way the hosted functions do.
create or replace function auth.uid() returns uuid
language plpgsql stable as $$
declare c text;
begin
  c := current_setting('request.jwt.claims', true);
  if c is null or c = '' then return null; end if;
  return nullif(c::jsonb ->> 'sub', '')::uuid;
exception when others then return null;
end;
$$;

create or replace function auth.role() returns text
language plpgsql stable as $$
declare c text;
begin
  c := current_setting('request.jwt.claims', true);
  if c is null or c = '' then return null; end if;
  return nullif(c::jsonb ->> 'role', '');
exception when others then return null;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
