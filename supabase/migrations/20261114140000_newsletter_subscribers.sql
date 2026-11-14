-- ===========================================================================
-- newsletter_subscribers — "Never miss an update" mailing-list capture.
--
-- Anyone (including anonymous visitors) may subscribe with an email address.
-- We therefore allow INSERT for anon/authenticated, but NOT select/update/
-- delete — the list is private marketing data. Only platform admins may read
-- or manage it. Duplicate emails are harmless: the app does a plain insert and
-- treats the unique-violation (23505) as success, so re-subscribing is
-- idempotent. (A plain insert is used instead of "on conflict do nothing"
-- because anon has INSERT but not SELECT, and the on-conflict path needs
-- SELECT; the unique-violation path needs only INSERT.)
-- ===========================================================================
create table public.newsletter_subscribers (
  id           uuid primary key default gen_random_uuid(),
  -- Stored already lower-cased + trimmed by the server action, so a plain
  -- unique constraint gives case-insensitive dedup. A CHECK keeps direct
  -- inserts honest.
  email        text not null unique check (email = lower(email)),
  source       text not null default 'homepage',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;

alter table public.newsletter_subscribers enable row level security;

-- Public capture: anyone may insert a subscription row. The insert is further
-- constrained by the column defaults; no client-supplied flags are trusted.
create policy newsletter_insert on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

-- Private list: only platform admins may read or manage subscribers.
create policy newsletter_admin_select on public.newsletter_subscribers
  for select to authenticated
  using (public.is_platform_admin());

create policy newsletter_admin_manage on public.newsletter_subscribers
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.newsletter_subscribers is
  'Mailing-list captures from the public "Never miss an update" form. Public insert, admin-only read.';
