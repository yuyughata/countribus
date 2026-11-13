-- ===========================================================================
-- Phase 7 — Dashboard metrics + notifications.
-- ===========================================================================

-- Notifications log + per-user channel preferences.
create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users (id) on delete set null,
  booking_id          uuid references public.bookings (id) on delete set null,
  channel             text not null check (channel in ('email', 'sms', 'whatsapp', 'in_app')),
  template            text not null,
  recipient           text,
  payload             jsonb not null default '{}'::jsonb,
  status              text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed', 'skipped')),
  provider_message_id text,
  error               text,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  email     boolean not null default true,
  sms       boolean not null default true,
  whatsapp  boolean not null default false,
  updated_at timestamptz not null default now()
);

grant select on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notifications, public.notification_preferences to service_role;

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());
create policy notif_prefs_all on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Platform-wide dashboard metrics (super admin only).
create or replace function public.admin_dashboard_metrics(p_from timestamptz default (now() - interval '180 days'), p_to timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_platform_admin() then raise exception 'not authorized'; end if;
  select jsonb_build_object(
    'gross_booking_kobo', coalesce((select sum(amount_kobo) from public.financial_ledger where entry_type='booking_gross' and created_at between p_from and p_to), 0),
    'commission_kobo', coalesce((select -sum(amount_kobo) from public.financial_ledger where entry_type='platform_commission' and created_at between p_from and p_to), 0),
    'bookings_paid', (select count(*) from public.bookings where status='paid' and created_at between p_from and p_to),
    'active_trips', (select count(*) from public.schedules where status='published' and departure_at >= now()),
    'vendors', (select count(*) from public.vendors where status='approved'),
    'passengers', (select count(distinct created_by) from public.bookings where created_by is not null)
  ) into r;
  return r;
end;
$$;
revoke all on function public.admin_dashboard_metrics(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard_metrics(timestamptz, timestamptz) to authenticated, service_role;

-- Vendor-scoped dashboard metrics.
create or replace function public.vendor_dashboard_metrics(p_vendor uuid, p_from timestamptz default (now() - interval '180 days'), p_to timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not (public.is_platform_admin() or public.has_vendor_role(p_vendor, array['vendor_owner','vendor_manager','finance_officer','booking_officer']::public.vendor_role[])) then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object(
    'gross_booking_kobo', coalesce((select sum(amount_kobo) from public.financial_ledger where vendor_id=p_vendor and entry_type='booking_gross' and created_at between p_from and p_to), 0),
    'net_kobo', coalesce((select sum(amount_kobo) from public.financial_ledger where vendor_id=p_vendor and entry_type='vendor_net' and created_at between p_from and p_to), 0),
    'bookings_paid', (select count(*) from public.bookings where vendor_id=p_vendor and status='paid' and created_at between p_from and p_to),
    'upcoming_trips', (select count(*) from public.schedules where vendor_id=p_vendor and status='published' and departure_at >= now()),
    'vehicles', (select count(*) from public.vehicles where vendor_id=p_vendor and status='active')
  ) into r;
  return r;
end;
$$;
revoke all on function public.vendor_dashboard_metrics(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.vendor_dashboard_metrics(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- Monthly gross booking value for the revenue chart (admin; last 12 months).
create or replace function public.admin_revenue_by_month() returns table (month text, gross_kobo bigint)
language sql stable security definer set search_path = public as $$
  select to_char(date_trunc('month', created_at), 'Mon') as month,
         coalesce(sum(amount_kobo), 0)::bigint
  from public.financial_ledger
  where entry_type = 'booking_gross' and created_at >= date_trunc('month', now()) - interval '11 months'
    and public.is_platform_admin()
  group by date_trunc('month', created_at)
  order by date_trunc('month', created_at);
$$;
revoke all on function public.admin_revenue_by_month() from public, anon;
grant execute on function public.admin_revenue_by_month() to authenticated, service_role;
