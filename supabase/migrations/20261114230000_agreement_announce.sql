-- Track when an agreement version was announced to operators (so they can be
-- notified to re-sign). Lets the admin notify once per version instead of on
-- every clause edit.
alter table public.agreements add column announced_at timestamptz;
