-- In-app notifications: let a user mark their OWN notifications as read, so the
-- dashboard bell can show an unread count and clear it. Adds a read timestamp
-- and a narrow (read_at-only) update path for authenticated users.
alter table public.notifications add column read_at timestamptz;

-- Column-scoped update grant: authenticated users may only touch read_at.
grant update (read_at) on public.notifications to authenticated;

-- RLS: a user may update only their own notification rows.
create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
