-- ===========================================================================
-- Demo user accounts — DEMO/STAGING ONLY. Do NOT run against production.
--
-- Creates one account per role so every view can be explored, plus an approved
-- demo operator ("Chisco Express"). Idempotent (safe to re-run).
--
-- Password is supplied at run time (never committed). Pass it with psql, e.g.
--   psql "$DATABASE_URL" -v demo_pw="'your-demo-password'" -f supabase/seed_demo_users.sql
-- (Note the embedded single quotes.) Change/rotate it before any real use, and
-- delete these accounts for production.
\if :{?demo_pw}
\else
  \set demo_pw '''CHANGE-ME-demo-password'''
\endif
--
-- Accounts:
--   admin@countribus.ng        Super Admin (platform)
--   owner@chiscoexpress.ng     Vendor Owner      (Chisco Express)
--   manager@chiscoexpress.ng   Vendor Manager    (Chisco Express)
--   booking@chiscoexpress.ng   Booking Officer   (Chisco Express)
--   terminal@chiscoexpress.ng  Terminal Staff    (Chisco Express)
--   traveller@countribus.ng    Passenger / customer
--
-- Auth rows are seeded directly (email provider): auth.users with a bcrypt
-- password + the empty token columns GoTrue expects, and a matching
-- auth.identities row. The on_auth_user_created trigger fills public.profiles.
-- The platform-admin flag and vendor_owner role are protected by guard
-- triggers, so those writes run as service_role (their sanctioned bypass).
-- ===========================================================================

with demo(id, email, full_name, phone) as (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid,'admin@countribus.ng','Amara Admin','+2348000000001'),
    ('d0000000-0000-4000-8000-000000000002'::uuid,'owner@chiscoexpress.ng','Obi Owner','+2348000000002'),
    ('d0000000-0000-4000-8000-000000000003'::uuid,'manager@chiscoexpress.ng','Maryam Manager','+2348000000003'),
    ('d0000000-0000-4000-8000-000000000004'::uuid,'booking@chiscoexpress.ng','Bola Booking','+2348000000004'),
    ('d0000000-0000-4000-8000-000000000005'::uuid,'terminal@chiscoexpress.ng','Tunde Terminal','+2348000000005'),
    ('d0000000-0000-4000-8000-000000000006'::uuid,'traveller@countribus.ng','Pat Passenger','+2348000000006')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email,
  extensions.crypt(:demo_pw, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', d.full_name, 'phone', d.phone),
  now(), now(), '', '', '', ''
from demo d
on conflict do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.email in ('admin@countribus.ng','owner@chiscoexpress.ng','manager@chiscoexpress.ng',
                  'booking@chiscoexpress.ng','terminal@chiscoexpress.ng','traveller@countribus.ng')
on conflict do nothing;

set role service_role;

update public.profiles set is_platform_admin = true where id = 'd0000000-0000-4000-8000-000000000001';

insert into public.vendors (id, name, slug, status, contact_email, contact_phone, created_by, approved_by, approved_at)
values ('e0000000-0000-4000-8000-000000000001','Chisco Express','chisco-express','approved',
        'hello@chiscoexpress.ng','+2348000000010',
        'd0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001', now())
on conflict (id) do nothing;

insert into public.vendor_staff (vendor_id, user_id, role) values
 ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','vendor_owner'),
 ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000003','vendor_manager'),
 ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000004','booking_officer'),
 ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000005','terminal_staff')
on conflict do nothing;

reset role;
