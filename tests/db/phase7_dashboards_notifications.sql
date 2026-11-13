-- ===========================================================================
-- Phase 7 — Dashboard metrics + notifications: authorization & tenant isolation.
-- Run on a FRESH DB (harness + all migrations), like the other phase suites.
-- Every printed line must read PASS.
-- ===========================================================================
\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- --- Actors ---------------------------------------------------------------
-- admin = platform admin; oA = owner of vendor A; oB = owner of vendor B;
-- cust = passenger who makes a paid booking on vendor A.
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000070ad','admin@c.ng'),
 ('00000000-0000-0000-0000-0000000070a1','oa@c.ng'),
 ('00000000-0000-0000-0000-0000000070b1','ob@c.ng'),
 ('00000000-0000-0000-0000-0000000070c1','cust@c.ng');
set role service_role;
update public.profiles set is_platform_admin=true where id='00000000-0000-0000-0000-0000000070ad';
reset role;

-- Vendor A (owner oA) + Vendor B (owner oB), both approved.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000070a1','VA','va-p7','00000000-0000-0000-0000-0000000070a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000070a1','00000000-0000-0000-0000-0000000070a1','vendor_owner');
reset role; reset request.jwt.claims;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070b1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000070b1','VB','vb-p7','00000000-0000-0000-0000-0000000070b1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000070b1','00000000-0000-0000-0000-0000000070b1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role;
update public.vendors set status='approved' where id in ('10000000-0000-0000-0000-0000000070a1','10000000-0000-0000-0000-0000000070b1');
reset role;

-- A published schedule on vendor A, then a paid booking so metrics are non-zero.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070a1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000070a1','10000000-0000-0000-0000-0000000070a1',cat,'P7-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('30000000-0000-0000-0000-0000000070a1','10000000-0000-0000-0000-0000000070a1','20000000-0000-0000-0000-0000000070a1','L',1,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('40000000-0000-0000-0000-0000000070a1','10000000-0000-0000-0000-0000000070a1',orig,dest,'L-A') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('50000000-0000-0000-0000-0000000070a1','10000000-0000-0000-0000-0000000070a1',rid,'20000000-0000-0000-0000-0000000070a1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000);
  perform public.publish_schedule('50000000-0000-0000-0000-0000000070a1');
end $$;
reset role; reset request.jwt.claims;

set role anon;
do $$ declare s1 text; s2 text; bk uuid; ref text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000070a1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000070a1' and seat_label='1B';
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000070c1","role":"authenticated"}',true);
  perform set_config('role','authenticated',true);
  perform public.hold_seats('50000000-0000-0000-0000-0000000070a1', array[s1,s2], 'tok-7', 10);
  select booking_id, reference into bk, ref from public.create_booking_from_hold('50000000-0000-0000-0000-0000000070a1','tok-7',
    '{"name":"C","phone":"+2348030000000","email":"cust@c.ng"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','P1'), jsonb_build_object('seat_id',s2,'full_name','P2')));
  perform set_config('role','service_role',true); perform set_config('request.jwt.claims','',true);
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo) select bk,'paystack',ref,grand_total_kobo from public.bookings where id=bk;
  perform public.confirm_payment('paystack','evt7',ref,(select grand_total_kobo from public.bookings where id=bk));
end $$;
reset role;

-- Seed notifications: one for the customer, one for owner B (unrelated to cust).
set role service_role;
insert into public.notifications(user_id,channel,template,recipient,status) values
 ('00000000-0000-0000-0000-0000000070c1','email','booking_confirmed','cust@c.ng','sent'),
 ('00000000-0000-0000-0000-0000000070b1','in_app','welcome',null,'sent');
reset role;

-- ===== TEST 1: a user sees ONLY their own notifications =====
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070c1","role":"authenticated"}';
select pg_temp.chk('customer sees exactly their own 1 notification',
  (select count(*) from public.notifications) = 1);
select pg_temp.chk('customer cannot see owner B''s notification',
  (select count(*) from public.notifications where user_id='00000000-0000-0000-0000-0000000070b1') = 0);
reset role; reset request.jwt.claims;

-- ===== TEST 2: platform admin sees all notifications =====
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070ad","role":"authenticated"}';
select pg_temp.chk('platform admin sees all notifications (>=2)',
  (select count(*) from public.notifications) >= 2);
reset role; reset request.jwt.claims;

-- ===== TEST 3: a user cannot write a preferences row for someone else =====
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070c1","role":"authenticated"}';
do $$ begin
  insert into public.notification_preferences(user_id,email) values ('00000000-0000-0000-0000-0000000070b1', false);
  raise notice 'FAIL customer blocked from writing another user''s preferences';
exception when others then raise notice 'PASS customer blocked from writing another user''s preferences'; end $$;
-- but CAN manage their own
insert into public.notification_preferences(user_id,email) values ('00000000-0000-0000-0000-0000000070c1', false);
select pg_temp.chk('customer manages their own preferences',
  (select email = false from public.notification_preferences where user_id='00000000-0000-0000-0000-0000000070c1'));
reset role; reset request.jwt.claims;

-- ===== TEST 4: admin_dashboard_metrics is admin-only =====
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070c1","role":"authenticated"}';
do $$ begin
  perform public.admin_dashboard_metrics();
  raise notice 'FAIL non-admin blocked from admin_dashboard_metrics';
exception when others then raise notice 'PASS non-admin blocked from admin_dashboard_metrics'; end $$;
reset role; reset request.jwt.claims;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070ad","role":"authenticated"}';
select pg_temp.chk('admin metrics report the paid booking (bookings_paid=1)',
  ((public.admin_dashboard_metrics() ->> 'bookings_paid')::int) = 1);
select pg_temp.chk('admin metrics gross booking value = 2,000,000 kobo',
  ((public.admin_dashboard_metrics() ->> 'gross_booking_kobo')::bigint) = 2000000);
select pg_temp.chk('admin revenue-by-month returns >=1 row for the admin',
  (select count(*) from public.admin_revenue_by_month()) >= 1);
reset role; reset request.jwt.claims;

-- ===== TEST 5: admin_revenue_by_month leaks nothing to a non-admin =====
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070c1","role":"authenticated"}';
select pg_temp.chk('non-admin gets 0 revenue rows',
  (select count(*) from public.admin_revenue_by_month()) = 0);
reset role; reset request.jwt.claims;

-- ===== TEST 6: vendor_dashboard_metrics is tenant-scoped =====
-- owner A reads vendor A (allowed) and the paid booking shows up.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000070a1","role":"authenticated"}';
select pg_temp.chk('owner A sees their own vendor metrics (bookings_paid=1)',
  ((public.vendor_dashboard_metrics('10000000-0000-0000-0000-0000000070a1') ->> 'bookings_paid')::int) = 1);
-- owner A CANNOT read vendor B's metrics (cross-tenant).
do $$ begin
  perform public.vendor_dashboard_metrics('10000000-0000-0000-0000-0000000070b1');
  raise notice 'FAIL owner A blocked from vendor B metrics';
exception when others then raise notice 'PASS owner A blocked from vendor B metrics'; end $$;
reset role; reset request.jwt.claims;
