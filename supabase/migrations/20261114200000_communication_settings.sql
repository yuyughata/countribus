-- ===========================================================================
-- communication_settings — admin-configurable provider credentials for the
-- notification channels (Resend email, Twilio SMS, Meta WhatsApp). Single row.
--
-- Secrets live here (admin-only via RLS); the senders read them with the
-- service-role client (which bypasses RLS) and fall back to env vars when a
-- field is blank. The admin UI never sends raw secrets to the browser — it
-- shows only whether each is configured.
-- ===========================================================================
create table public.communication_settings (
  id                 boolean primary key default true check (id),
  -- Resend (email)
  email_enabled      boolean not null default false,
  resend_api_key     text,
  email_from         text,  -- e.g. no-reply@countribus.ng
  email_from_name    text,  -- e.g. Countribus
  -- SMS (Twilio)
  sms_enabled        boolean not null default false,
  twilio_account_sid text,
  twilio_auth_token  text,
  twilio_from        text,
  -- WhatsApp (Meta Cloud API)
  whatsapp_enabled   boolean not null default false,
  whatsapp_token     text,
  whatsapp_phone_id  text,
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users (id)
);
insert into public.communication_settings (id) values (true);

create trigger communication_settings_set_updated_at
  before update on public.communication_settings
  for each row execute function public.set_updated_at();

grant select, update on public.communication_settings to authenticated;
grant all on public.communication_settings to service_role;
alter table public.communication_settings enable row level security;

create policy communication_settings_admin on public.communication_settings for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

comment on table public.communication_settings is
  'Admin-configured provider credentials for email/SMS/WhatsApp. Secrets are admin-only; senders read via service role with env fallback.';
