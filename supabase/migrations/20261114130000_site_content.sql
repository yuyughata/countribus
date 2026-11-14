-- ===========================================================================
-- site_content — editable homepage content blocks (a light CMS).
--
-- Each row is one section (hero, features, how, operator, …) stored as jsonb.
-- The app merges these over built-in defaults, so the homepage renders fine
-- before any edit. Public read (it is public content); only a platform admin
-- may write. The select policy uses `true` (no helper call) so the anonymous
-- homepage read never needs EXECUTE on a security-definer function.
-- ===========================================================================
create table public.site_content (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
grant all on public.site_content to service_role;

alter table public.site_content enable row level security;

create policy site_content_select on public.site_content for select using (true);
create policy site_content_manage on public.site_content for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
