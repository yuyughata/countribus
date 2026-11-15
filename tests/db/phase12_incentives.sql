\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- ===========================================================================
-- Staff sales incentives suite.
--   * only the owner can set incentive rules (booking officer denied)
--   * per-staff override wins over the vendor-wide default
--   * accrual fires when a staff-sold booking is paid (via the webhook)
--   * cancel of a paid booking reverses a still-pending accrual
--   * recording a payment settles outstanding pending accruals
--   * performance aggregate reflects sales + balances
--   * cross-vendor cannot read accruals (RLS)
-- Fixed IDs; expects a FRESH database (harness + all migrations).
-- ===========================================================================

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-0000000000a1','owner-a@ex.ng'),
  ('00000000-0000-0000-0000-0000000000a2','officer-a@ex.ng'),
  ('00000000-0000-0000-0000-0000000000b1','owner-b@ex.ng');
insert into public.profiles(id,full_name,email) values
  ('00000000-0000-0000-0000-0000000000a2','Olu Officer','officer-a@ex.ng')
  on conflict (id) do update set full_name=excluded.full_name;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000a1','IncA','inc-a','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='11000000-0000-0000-0000-0000000000a1'; reset role;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','booking_officer');
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('22000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',cat,'IA-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('33000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1','22000000-0000-0000-0000-0000000000a1','L',1,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('44000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',orig,dest,'IA') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('55000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',rid,'22000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000);
  perform public.publish_schedule('55000000-0000-0000-0000-0000000000a1');
end $$;
reset role; reset request.jwt.claims;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000b1','IncB','inc-b','00000000-0000-0000-0000-0000000000b1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','vendor_owner');
reset role; reset request.jwt.claims;

-- A booking officer cannot set incentive rules.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ begin
  perform public.set_staff_incentive_rule('11000000-0000-0000-0000-0000000000a1', null, 'percent', null, 500);
  raise notice 'FAIL officer blocked from setting rule (unexpected success)';
exception when others then raise notice 'PASS officer cannot set incentive rule: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- Owner sets a vendor-wide 5% rule.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin perform public.set_staff_incentive_rule('11000000-0000-0000-0000-0000000000a1', null, 'percent', null, 500); end $$;
reset role; reset request.jwt.claims;

-- Officer sells seat 1A (gross 1,000,000); pay it -> accrue 5% = 50,000.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ declare s1 text; r record; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  select * into r from public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"B1","phone":"+2348030000001"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','B1','type','adult')));
  perform set_config('my.ref1', r.reference, false);
end $$;
reset role; reset request.jwt.claims;
set role service_role;
do $$ declare bk uuid; ref text := current_setting('my.ref1'); begin
  select id into bk from public.bookings where reference=ref;
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo) values (bk,'paystack',ref,1000000);
  perform public.confirm_payment('paystack','evt-i1',ref,1000000);
end $$;
reset role;
select pg_temp.chk('vendor-wide 5% accrual = 50,000 for the officer',
  (select amount_kobo=50000 and status='pending' from public.staff_incentives
   where booking_id=(select id from public.bookings where reference=current_setting('my.ref1'))));

-- Owner adds a per-staff override: fixed 70,000 for the officer.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin perform public.set_staff_incentive_rule('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','fixed',70000,null); end $$;
reset role; reset request.jwt.claims;

-- Officer sells seat 1B; pay it -> per-staff override wins -> accrue fixed 70,000.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ declare s2 text; r record; begin
  select seat_id into s2 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1B';
  select * into r from public.create_walkin_booking('55000000-0000-0000-0000-0000000000a1',
    '{"name":"B2","phone":"+2348030000002"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s2,'full_name','B2','type','adult')));
  perform set_config('my.ref2', r.reference, false);
end $$;
reset role; reset request.jwt.claims;
set role service_role;
do $$ declare bk uuid; ref text := current_setting('my.ref2'); begin
  select id into bk from public.bookings where reference=ref;
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo) values (bk,'paystack',ref,1000000);
  perform public.confirm_payment('paystack','evt-i2',ref,1000000);
end $$;
reset role;
select pg_temp.chk('per-staff override wins: accrual = fixed 70,000',
  (select amount_kobo=70000 from public.staff_incentives
   where booking_id=(select id from public.bookings where reference=current_setting('my.ref2'))));

-- Cancel booking 1 (paid) -> its pending accrual reverses.
set role service_role;
do $$ declare bk uuid; begin select id into bk from public.bookings where reference=current_setting('my.ref1'); perform public.cancel_booking(bk,'test'); end $$;
reset role;
select pg_temp.chk('cancel reverses the pending accrual',
  (select status='reversed' from public.staff_incentives
   where booking_id=(select id from public.bookings where reference=current_setting('my.ref1'))));

-- Owner records an incentive payment -> settles outstanding pending (70,000 only).
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare r record; begin
  select * into r from public.record_staff_incentive_payment('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','Nov payout');
  perform set_config('my.paid', r.amount_kobo::text, false);
end $$;
reset role; reset request.jwt.claims;
select pg_temp.chk('payment settles outstanding pending = 70,000 (reversed excluded)',
  current_setting('my.paid')='70000');
select pg_temp.chk('booking 2 incentive now paid',
  (select status='paid' from public.staff_incentives where booking_id=(select id from public.bookings where reference=current_setting('my.ref2'))));

-- Performance aggregate: 1 paid sale (booking 2), gross 1,000,000, paid 70,000, pending 0.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select pg_temp.chk('performance: officer has 1 paid sale, 0 pending, 70,000 paid',
  (select sales_count=1 and gross_sold_kobo=1000000 and incentive_pending_kobo=0 and incentive_paid_kobo=70000
   from public.staff_sales_performance('11000000-0000-0000-0000-0000000000a1')
   where staff_id='00000000-0000-0000-0000-0000000000a2'));
reset role; reset request.jwt.claims;

-- RLS: vendor B owner cannot read vendor A's accruals.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select pg_temp.chk('cross-vendor cannot read staff_incentives (RLS)',
  (select count(*) from public.staff_incentives)=0);
reset role; reset request.jwt.claims;
