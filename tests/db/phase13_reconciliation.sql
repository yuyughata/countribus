\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- ===========================================================================
-- Daily reconciliation suite.
--   * summary splits online vs walk-in bookings + revenue, commission, net,
--     passengers for the day
--   * an unreconciled transaction (success payment, booking not paid) is counted
--     and listed
--   * per-vehicle passenger totals for the day's departures
--   * authz: non-admin cannot run the platform-wide view; cross-vendor denied
-- Fixed IDs; expects a FRESH database (harness + all migrations).
-- ===========================================================================

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-0000000000a1','owner-a@ex.ng'),
  ('00000000-0000-0000-0000-0000000000a2','officer-a@ex.ng'),
  ('00000000-0000-0000-0000-0000000000b1','owner-b@ex.ng');

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000a1','RecA','rec-a','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='11000000-0000-0000-0000-0000000000a1'; reset role;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','booking_officer');
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,display_name,capacity) values ('22000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',cat,'RC-1','Bus One',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('33000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1','22000000-0000-0000-0000-0000000000a1','L',2,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2),(tid,'2A',2,1),(tid,'2B',2,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('44000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',orig,dest,'RC') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('55000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',rid,'22000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '3 hours', now()+interval '12 hours', 1000000);
  perform public.publish_schedule('55000000-0000-0000-0000-0000000000a1');
end $$;
reset role; reset request.jwt.claims;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000b1','RecB','rec-b','00000000-0000-0000-0000-0000000000b1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','vendor_owner');
reset role; reset request.jwt.claims;

-- Dates (Lagos) for the asserts.
select set_config('my.pd', (now() at time zone 'Africa/Lagos')::date::text, false);
select set_config('my.vd', ((now()+interval '3 hours') at time zone 'Africa/Lagos')::date::text, false);

-- Booking 1: ONLINE (guest), seat 1A -> pay.
set role anon;
do $$ declare s1 text; bk uuid; ref text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.hold_seats('55000000-0000-0000-0000-0000000000a1', array[s1], 'tok-on', 10);
  select booking_id, reference into bk, ref from public.create_booking_from_hold(
    '55000000-0000-0000-0000-0000000000a1','tok-on',
    '{"name":"Ada","phone":"+2348030000001"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','Ada One')));
  perform set_config('my.ref_on', ref, false);
end $$;
reset role;
set role service_role;
do $$ declare bk uuid; ref text := current_setting('my.ref_on'); begin
  select id into bk from public.bookings where reference=ref;
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo) values (bk,'paystack',ref,1000000);
  perform public.confirm_payment('paystack','evt-on',ref,1000000);
end $$;
reset role;

-- Booking 2: WALK-IN (officer), seat 1B -> pay.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ declare s2 text; r record; begin
  select seat_id into s2 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1B';
  select * into r from public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"Counter","phone":"+2348030000002"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s2,'full_name','Counter One','type','adult')));
  perform set_config('my.ref_wi', r.reference, false);
end $$;
reset role; reset request.jwt.claims;
set role service_role;
do $$ declare bk uuid; ref text := current_setting('my.ref_wi'); begin
  select id into bk from public.bookings where reference=ref;
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo) values (bk,'paystack',ref,1000000);
  perform public.confirm_payment('paystack','evt-wi',ref,1000000);
end $$;
reset role;

-- Booking 3: ONLINE (guest), seat 2A -> a SUCCESS payment but NOT confirmed
-- (booking stays pending) = an unreconciled transaction.
set role anon;
do $$ declare s3 text; bk uuid; ref text; begin
  select seat_id into s3 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='2A';
  perform public.hold_seats('55000000-0000-0000-0000-0000000000a1', array[s3], 'tok-x', 10);
  select booking_id, reference into bk, ref from public.create_booking_from_hold(
    '55000000-0000-0000-0000-0000000000a1','tok-x',
    '{"name":"Ngo","phone":"+2348030000003"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s3,'full_name','Ngo One')));
  perform set_config('my.ref_x', ref, false);
end $$;
reset role;
set role service_role;
do $$ declare bk uuid; ref text := current_setting('my.ref_x'); begin
  select id into bk from public.bookings where reference=ref;
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo,status,verified_at)
    values (bk,'paystack',ref,1000000,'success',now());
end $$;
reset role;

-- Summary (owner A, today).
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select pg_temp.chk('summary: 1 online + 1 walk-in, revenue 2,000,000, 2 pax, commission 200,000, net 1,800,000',
  (select online_bookings=1 and online_revenue_kobo=1000000 and walkin_bookings=1 and walkin_revenue_kobo=1000000
       and total_bookings=2 and total_revenue_kobo=2000000 and passengers=2
       and commission_kobo=200000 and vendor_net_kobo=1800000
   from public.reconciliation_summary('11000000-0000-0000-0000-0000000000a1', current_setting('my.pd')::date)));
select pg_temp.chk('summary: 1 unreconciled transaction',
  (select unreconciled=1 from public.reconciliation_summary('11000000-0000-0000-0000-0000000000a1', current_setting('my.pd')::date)));
select pg_temp.chk('unreconciled detail lists the stuck booking',
  (select reference=current_setting('my.ref_x') and booking_status='pending_payment'
   from public.reconciliation_unreconciled('11000000-0000-0000-0000-0000000000a1', current_setting('my.pd')::date) limit 1));
select pg_temp.chk('vehicles: Bus One has 1 departure, 2 paid passengers',
  (select departures=1 and passengers=2 and registration_no='RC-1'
   from public.reconciliation_vehicles('11000000-0000-0000-0000-0000000000a1', current_setting('my.vd')::date)
   where vehicle_id='22000000-0000-0000-0000-0000000000a1'));
-- A vendor owner is NOT a platform admin: platform-wide view denied.
do $$ begin
  perform * from public.reconciliation_summary(null, current_setting('my.pd')::date);
  raise notice 'FAIL platform view blocked for non-admin (unexpected success)';
exception when others then raise notice 'PASS non-admin cannot run platform-wide reconciliation: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- Cross-vendor: owner B cannot reconcile vendor A.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
do $$ begin
  perform * from public.reconciliation_summary('11000000-0000-0000-0000-0000000000a1', current_setting('my.pd')::date);
  raise notice 'FAIL cross-vendor reconciliation blocked (unexpected success)';
exception when others then raise notice 'PASS cross-vendor reconciliation blocked: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;
