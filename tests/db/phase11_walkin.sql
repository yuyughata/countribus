\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- ===========================================================================
-- Walk-in (counter) bookings suite.
--   * booking_officer of the vendor can create+pay a walk-in (paid, seats
--     booked, ledger split, tickets, counter payment, channel/sold_by set)
--   * a passenger (no vendor role) is denied
--   * a staff member of a DIFFERENT vendor is denied (cross-vendor)
--   * a seat already taken cannot be double-sold (across channels)
--   * one counter payment per booking (duplicate payment record blocked)
-- Fixed IDs; expects a FRESH database (harness + all migrations).
-- ===========================================================================

-- Users: owner (A), booking officer (A), passenger, owner of vendor B.
insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-0000000000a1','owner-a@ex.ng'),
  ('00000000-0000-0000-0000-0000000000a2','officer-a@ex.ng'),
  ('00000000-0000-0000-0000-0000000000a3','pax@ex.ng'),
  ('00000000-0000-0000-0000-0000000000b1','owner-b@ex.ng');

-- Vendor A + owner membership.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000a1','WalkA','walk-a','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='11000000-0000-0000-0000-0000000000a1'; reset role;

-- Owner adds a booking officer to vendor A.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','booking_officer');

-- Vehicle, published seat template (2 seats), route, published schedule.
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('22000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',cat,'WA-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('33000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1','22000000-0000-0000-0000-0000000000a1','L',1,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('44000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',orig,dest,'WA') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('55000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',rid,'22000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000);
  perform public.publish_schedule('55000000-0000-0000-0000-0000000000a1');
end $$;
reset role; reset request.jwt.claims;

-- Vendor B + owner membership (for the cross-vendor negative test).
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000b1','WalkB','walk-b','00000000-0000-0000-0000-0000000000b1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','vendor_owner');
reset role; reset request.jwt.claims;

-- 1) A passenger with no vendor role is denied.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"Pax","phone":"+2348030000000"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','Pax One','type','adult')));
  raise notice 'FAIL passenger blocked from walk-in (unexpected success)';
exception when others then raise notice 'PASS passenger blocked from walk-in: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- 2) Owner of vendor B cannot create a walk-in on vendor A's schedule.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"X","phone":"+2348030000000"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','X','type','adult')));
  raise notice 'FAIL cross-vendor blocked (unexpected success)';
exception when others then raise notice 'PASS cross-vendor walk-in blocked: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- 3) Booking officer of vendor A creates+pays a walk-in for 1 adult + 1 child.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ declare s1 text; s2 text; r record; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1B';
  select * into r from public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"Counter Buyer","phone":"+2348031111111"}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('seat_id',s1,'full_name','Adult One','type','adult'),
      jsonb_build_object('seat_id',s2,'full_name','Child Two','type','child_6_10')),
    '[]'::jsonb, 'cash', null);
  raise notice 'PASS walk-in created % total % kobo', r.reference, r.amount_kobo;
exception when others then raise notice 'FAIL officer walk-in create: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- Fare: adult 1,000,000 + child 6-10 half 500,000 = 1,500,000.
select pg_temp.chk('walk-in booking is paid, channel walk_in, grand total 1,500,000',
  (select status='paid' and channel='walk_in' and grand_total_kobo=1500000 from public.bookings where channel='walk_in'));
select pg_temp.chk('walk-in sold_by set to the booking officer',
  (select sold_by='00000000-0000-0000-0000-0000000000a2' from public.bookings where channel='walk_in'));
select pg_temp.chk('both seats now booked',
  (select count(*) from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and state='booked')=2);
select pg_temp.chk('commission split written (gross + commission + net)',
  (select count(*) from public.financial_ledger where booking_id=(select id from public.bookings where channel='walk_in'))=3);
select pg_temp.chk('commission = -150,000 (10% of 1,500,000)',
  (select amount_kobo from public.financial_ledger where entry_type='platform_commission' and booking_id=(select id from public.bookings where channel='walk_in'))=-150000);
select pg_temp.chk('2 active tickets generated',
  (select count(*) from public.ticket_documents where booking_id=(select id from public.bookings where channel='walk_in') and status='active')=2);
select pg_temp.chk('one counter payment recorded (cash, 1,500,000)',
  (select method='cash' and amount_kobo=1500000 from public.counter_payments where booking_id=(select id from public.bookings where channel='walk_in')));

-- 4) The same seat cannot be sold again (across channels): a fresh walk-in for
--    an already-booked seat fails.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"Dupe","phone":"+2348032222222"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','Dupe','type','adult')));
  raise notice 'FAIL double-sell blocked (unexpected success)';
exception when others then raise notice 'PASS seat double-sell blocked: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- 5) counter_payments is one-per-booking (duplicate payment record blocked).
set role service_role;
do $$ declare bk uuid; begin
  select id into bk from public.bookings where channel='walk_in';
  insert into public.counter_payments(booking_id,vendor_id,method,amount_kobo,receipt_ref,received_by)
    values (bk,'11000000-0000-0000-0000-0000000000a1','pos',1,'DUP','00000000-0000-0000-0000-0000000000a2');
  raise notice 'FAIL duplicate counter payment blocked (unexpected success)';
exception when others then raise notice 'PASS duplicate counter payment blocked: %', sqlerrm; end $$;
reset role;

-- RLS: vendor B owner cannot read vendor A's counter payments.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select pg_temp.chk('cross-vendor cannot read counter payments (RLS)',
  (select count(*) from public.counter_payments)=0);
reset role; reset request.jwt.claims;
