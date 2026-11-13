-- RLS / tenancy test suite for Phase 1. Run against countribus_test.
-- Prints PASS/FAIL per assertion. Any FAIL or uncaught error = failure.
\set ON_ERROR_STOP 0
\pset pager off

-- Fixed UUIDs
\set admin  '''00000000-0000-0000-0000-000000000001'''
\set ownerA '''00000000-0000-0000-0000-00000000000a'''
\set ownerB '''00000000-0000-0000-0000-00000000000b'''
\set mgrA   '''00000000-0000-0000-0000-00000000000c'''
\set outsid '''00000000-0000-0000-0000-00000000000d'''
\set vendA  '''10000000-0000-0000-0000-00000000000a'''
\set vendB  '''10000000-0000-0000-0000-00000000000b'''

-- Seed auth users (profiles auto-created by trigger). As postgres (superuser).
insert into auth.users(id,email,raw_user_meta_data) values
  (:admin ::uuid,'admin@countribus.ng','{"full_name":"Admin"}'),
  (:ownerA::uuid,'ownerA@a.ng','{"full_name":"Owner A"}'),
  (:ownerB::uuid,'ownerB@b.ng','{"full_name":"Owner B"}'),
  (:mgrA  ::uuid,'mgrA@a.ng','{"full_name":"Manager A"}'),
  (:outsid::uuid,'out@x.ng','{"full_name":"Outsider"}');

-- Make admin a platform admin via service_role (bypasses RLS; guard allows).
set role service_role;
update public.profiles set is_platform_admin = true where id = :admin::uuid;
reset role;

-- Helper to assert a boolean
create or replace function pg_temp.check(label text, cond boolean) returns void
language plpgsql as $$ begin
  raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label;
end $$;

-- ===== Owner A creates vendor A and bootstraps ownership =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values (:vendA::uuid,'Alpha Transit','alpha',:ownerA::uuid);
insert into public.vendor_staff(vendor_id,user_id,role) values (:vendA::uuid,:ownerA::uuid,'vendor_owner');
reset role; reset request.jwt.claims;

-- ===== Owner B creates vendor B =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values (:vendB::uuid,'Beta Lines','beta',:ownerB::uuid);
insert into public.vendor_staff(vendor_id,user_id,role) values (:vendB::uuid,:ownerB::uuid,'vendor_owner');
reset role; reset request.jwt.claims;

-- ===== TEST 1: Owner A sees only vendor A (both still pending) =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select pg_temp.check('owner A sees exactly their own vendor (not B)',
  (select array_agg(name order by name) from public.vendors) = array['Alpha Transit']);

-- ===== TEST 2: Owner A cannot approve their own vendor (guard) =====
do $$ begin
  update public.vendors set status='approved' where id='10000000-0000-0000-0000-00000000000a';
  raise notice 'FAIL owner A blocked from self-approval';
exception when others then raise notice 'PASS owner A blocked from self-approval'; end $$;

-- ===== TEST 3: Owner A cannot insert staff into vendor B =====
do $$ begin
  insert into public.vendor_staff(vendor_id,user_id,role)
    values ('10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a','booking_officer');
  raise notice 'FAIL owner A blocked from adding staff to vendor B';
exception when others then raise notice 'PASS owner A blocked from adding staff to vendor B'; end $$;

-- ===== TEST 4: Owner A adds a manager to vendor A (allowed) =====
insert into public.vendor_staff(vendor_id,user_id,role)
  values (:vendA::uuid,:mgrA::uuid,'vendor_manager');
select pg_temp.check('owner A added a manager to vendor A',
  (select count(*) from public.vendor_staff where vendor_id=:vendA::uuid) = 2);
reset role; reset request.jwt.claims;

-- ===== TEST 5: Manager A cannot mint a vendor_owner (privilege escalation) =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$ begin
  insert into public.vendor_staff(vendor_id,user_id,role)
    values ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000d','vendor_owner');
  raise notice 'FAIL manager A blocked from minting an owner';
exception when others then raise notice 'PASS manager A blocked from minting an owner'; end $$;
reset role; reset request.jwt.claims;

-- ===== TEST 6: Owner A cannot read vendor B staff =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select pg_temp.check('owner A cannot read vendor B staff',
  (select count(*) from public.vendor_staff where vendor_id=:vendB::uuid) = 0);
reset role; reset request.jwt.claims;

-- ===== TEST 7: User cannot self-escalate to platform admin =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$ begin
  update public.profiles set is_platform_admin=true where id='00000000-0000-0000-0000-00000000000a';
  raise notice 'FAIL user blocked from self-escalation';
exception when others then raise notice 'PASS user blocked from self-escalation'; end $$;
reset role; reset request.jwt.claims;

-- ===== TEST 8: Admin approves vendor A (allowed) + audit row written =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
update public.vendors set status='approved', approved_by=:admin::uuid, approved_at=now()
  where id=:vendA::uuid;
select pg_temp.check('admin approved vendor A',
  (select status::text from public.vendors where id=:vendA::uuid) = 'approved');
select pg_temp.check('approval wrote an audit log row',
  (select count(*) from public.audit_logs
    where entity='vendor' and entity_id=:vendA::uuid and action='vendor.status_changed') = 1);
reset role; reset request.jwt.claims;

-- ===== TEST 9: Anonymous sees approved vendor A only (not pending B) =====
set role anon;
select pg_temp.check('anon sees approved vendor A',
  exists(select 1 from public.vendors where id=:vendA::uuid));
select pg_temp.check('anon cannot see pending vendor B',
  not exists(select 1 from public.vendors where id=:vendB::uuid));
reset role;

-- ===== TEST 10: Admin sees both vendors =====
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select pg_temp.check('platform admin sees both vendors',
  (select count(*) from public.vendors) = 2);
reset role; reset request.jwt.claims;
