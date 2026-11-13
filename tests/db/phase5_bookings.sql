\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- Setup: approved vendor, vehicle, published layout, route, published schedule, held seats.
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','o@a.ng');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000a1','A','a-p5','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000000a1'; reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',cat,'P5-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('30000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-0000000000a1','L',1,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('40000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',orig,dest,'L-A') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('50000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',rid,'20000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000);
  perform public.publish_schedule('50000000-0000-0000-0000-0000000000a1');
end $$;
reset role; reset request.jwt.claims;

-- Guest holds both seats, then creates a booking.
set role anon;
do $$ declare s1 text; s2 text; bk uuid; ref text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1B';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000a1', array[s1,s2], 'tok-5', 10);
  select booking_id, reference into bk, ref from public.create_booking_from_hold(
    '50000000-0000-0000-0000-0000000000a1','tok-5',
    '{"name":"Ada","phone":"+2348030000000","email":"ada@example.com"}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('seat_id',s1,'full_name','Ada One','phone','+2348030000001'),
      jsonb_build_object('seat_id',s2,'full_name','Ada Two','phone','+2348030000002')));
  raise notice 'PASS booking created %', ref;
exception when others then raise notice 'FAIL create booking: %', sqlerrm; end $$;
reset role;

select pg_temp.chk('booking is pending_payment with grand total 2,000,000 kobo',
  (select status='pending_payment' and grand_total_kobo=2000000 and passenger_count=2 from public.bookings limit 1));

-- Server creates a payment transaction (as service role, like the init step).
set role service_role;
insert into public.payment_transactions(booking_id, provider, provider_reference, amount_kobo)
  select id, 'paystack', 'PSK-REF-1', grand_total_kobo from public.bookings limit 1;

-- Amount mismatch is rejected (no confirmation).
select pg_temp.chk('amount mismatch rejected',
  public.confirm_payment('paystack','evt-bad','PSK-REF-1', 999999) = 'amount_mismatch');
select pg_temp.chk('booking still not paid after mismatch',
  (select status<>'paid' from public.bookings limit 1));

-- Correct verified event confirms the booking.
select pg_temp.chk('verified payment confirms booking',
  public.confirm_payment('paystack','evt-1','PSK-REF-1', 2000000) = 'confirmed');
select pg_temp.chk('booking is paid', (select status='paid' from public.bookings limit 1));
select pg_temp.chk('both seats now booked',
  (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and state='booked')=2);

-- Duplicate webhook is a no-op.
select pg_temp.chk('duplicate webhook event is idempotent',
  public.confirm_payment('paystack','evt-1','PSK-REF-1', 2000000) = 'duplicate');

-- Ledger: gross +2,000,000; commission -200,000 (10%); vendor_net +1,800,000; sums to net once.
select pg_temp.chk('gross ledger entry = 2,000,000',
  (select amount_kobo from public.financial_ledger where entry_type='booking_gross')=2000000);
select pg_temp.chk('commission = -200,000 (10%)',
  (select amount_kobo from public.financial_ledger where entry_type='platform_commission')=-200000);
select pg_temp.chk('vendor_net = 1,800,000',
  (select amount_kobo from public.financial_ledger where entry_type='vendor_net')=1800000);
select pg_temp.chk('exactly 3 ledger entries (no duplication from duplicate webhook)',
  (select count(*) from public.financial_ledger)=3);
select pg_temp.chk('2 active tickets generated',
  (select count(*) from public.ticket_documents where status='active')=2);
reset role;

-- Cancel by the booking owner frees seats and revokes tickets.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare bk uuid; begin select id into bk from public.bookings limit 1; perform public.cancel_booking(bk,'test'); end $$;
select pg_temp.chk('cancel frees both seats',
  (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and state='available')=2);
select pg_temp.chk('cancel revokes tickets',
  (select count(*) from public.ticket_documents where status='revoked')=2);
reset role; reset request.jwt.claims;
