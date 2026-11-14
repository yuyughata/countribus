-- ===========================================================================
-- email_campaigns — one-off / broadcast emails composed in the admin
-- Communications → Emails tab (newsletter, promotion, announcement, service
-- update). Admin-only. Sending is performed by the app via Resend.
-- ===========================================================================
create type public.email_campaign_type as enum (
  'newsletter', 'promotion', 'announcement', 'service_update'
);
create type public.email_campaign_status as enum ('draft', 'sending', 'sent', 'failed');

create table public.email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  type             public.email_campaign_type not null default 'newsletter',
  subject          text not null default '',
  preview_text     text,
  header_image_url text,
  body_html        text not null default '',
  button_text      text,
  button_url       text,
  footer_image_url text,
  -- Audience segments, e.g. {'customers','vendor_managers','all_staff','team','everyone'}
  audiences        text[] not null default '{}',
  -- Specific extra recipient emails
  extra_recipients text[] not null default '{}',
  status           public.email_campaign_status not null default 'draft',
  recipient_count  int,
  sent_count       int,
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  sent_at          timestamptz
);
create index email_campaigns_created_idx on public.email_campaigns (created_at desc);

create trigger email_campaigns_set_updated_at
  before update on public.email_campaigns
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.email_campaigns to authenticated;
grant all on public.email_campaigns to service_role;
alter table public.email_campaigns enable row level security;

create policy email_campaigns_admin on public.email_campaigns for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

comment on table public.email_campaigns is
  'Broadcast emails composed in Communications → Emails. Admin-only; sent via Resend.';
