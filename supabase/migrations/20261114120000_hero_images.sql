-- ===========================================================================
-- Homepage hero photo slider — admin-managed images.
--
-- hero_images holds the slideshow shown behind the homepage hero. Anyone can
-- read the active ones (the public landing page); only a platform admin may
-- add, reorder, toggle or delete them. Files live in a public Storage bucket
-- ("hero"); the admin's own session uploads them (Storage RLS below), so no
-- service-role key is required.
--
-- The Storage statements are guarded with to_regclass so this migration still
-- applies on a bare Postgres (local test harness) that has no storage schema.
-- ===========================================================================
create table public.hero_images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text,                     -- path within the 'hero' bucket (if uploaded)
  url          text not null,            -- public URL rendered by the hero
  caption      text,
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index hero_images_order_idx on public.hero_images (sort_order, created_at);

grant select on public.hero_images to anon, authenticated;
grant insert, update, delete on public.hero_images to authenticated;
grant all on public.hero_images to service_role;

alter table public.hero_images enable row level security;

-- Public reads active images (no function call — anon can't EXECUTE helpers).
-- Admins read all (incl. hidden) through the manage policy below.
create policy hero_images_select on public.hero_images for select
  using (is_active);
-- Only platform admins manage the slideshow (and may read hidden images).
create policy hero_images_manage on public.hero_images for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- --- Storage: public 'hero' bucket + admin-only writes -------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('hero', 'hero', true)
      on conflict (id) do nothing;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists hero_objects_public_read on storage.objects';
    execute 'create policy hero_objects_public_read on storage.objects for select using (bucket_id = ''hero'')';

    execute 'drop policy if exists hero_objects_admin_insert on storage.objects';
    execute 'create policy hero_objects_admin_insert on storage.objects for insert to authenticated with check (bucket_id = ''hero'' and public.is_platform_admin())';

    execute 'drop policy if exists hero_objects_admin_update on storage.objects';
    execute 'create policy hero_objects_admin_update on storage.objects for update to authenticated using (bucket_id = ''hero'' and public.is_platform_admin())';

    execute 'drop policy if exists hero_objects_admin_delete on storage.objects';
    execute 'create policy hero_objects_admin_delete on storage.objects for delete to authenticated using (bucket_id = ''hero'' and public.is_platform_admin())';
  end if;
end $$;
