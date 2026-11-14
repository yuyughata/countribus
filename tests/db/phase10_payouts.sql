-- Phase 10: vendor payouts.
--   * a paid booking posts vendor_net to the ledger (via phase5-style flow)
--   * process_due_payouts sweeps unsettled vendor_net into a payout and links
--     the ledger entries; a second run is idempotent (nothing double-paid)
--   * RLS: a stranger can't read the payout; the vendor owner can
-- Expects a FRESH database (harness + all migrations). All lines must read PASS.
\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- ---- Setup: approved vendor, vehicle, 2-seat layout, published schedule, paid booking ----
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000c1','o@c.ng');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000c9','x@c.ng');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000c1','C','c-p10','00000000-0000-0000-0000-0000000000c1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000000c1'; reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-0000000000c1',cat,'P10-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('30000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-0000000000c1','20000000-0000-0000-0000-0000000000c1','L',1,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('40000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-0000000000c1',orig,dest,'L-C') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('50000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-0000000000c1',rid,'20000000-0000-0000-0000-0000000000c1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000);
  perform public.publish_schedule('50000000-0000-0000-0000-0000000000c1');
end $$;
reset role; reset request.jwt.claims;

set role anon;
do $$ declare s1 text; s2 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000c1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000c1' and seat_label='1B';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000c1', array[s1,s2], 'tok-10', 10);
  perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000000c1','tok-10',
    '{"name":"Ada","phone":"+2348030000000"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','Ada One'), jsonb_build_object('seat_id',s2,'full_name','Ada Two')));
end $$;
reset role;

set role service_role;
insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo)
  select id,'paystack','PSK-10', grand_total_kobo from public.bookings limit 1;
select pg_temp.chk('booking paid', public.confirm_payment('paystack','evt-10','PSK-10', 2000000) = 'confirmed');
reset role;

-- vendor_net posted (gross 2,000,000 − 10% commission = 1,800,000)
select pg_temp.chk('vendor_net ledger posted = 1,800,000',
  (select amount_kobo=1800000 from public.financial_ledger where vendor_id='10000000-0000-0000-0000-0000000000c1' and entry_type='vendor_net'));

-- No payout before the vendor has a verified account.
set role service_role;
select pg_temp.chk('no payout without a verified account',
  (select count(*)=0 from public.process_due_payouts(0)));
-- Add a verified payout account, then run.
insert into public.vendor_payout_accounts(vendor_id,bank_name,bank_code,account_number,account_name,is_verified)
  values ('10000000-0000-0000-0000-0000000000c1','GTBank','058','0123456789','C Operator Ltd', true);
select pg_temp.chk('process_due_payouts creates one payout of 1,800,000',
  (select amount_kobo=1800000 and entry_count=1 from public.process_due_payouts(0) limit 1));
reset role;

select pg_temp.chk('payout row exists, status scheduled',
  (select status='scheduled' and amount_kobo=1800000 from public.payouts where vendor_id='10000000-0000-0000-0000-0000000000c1'));
select pg_temp.chk('vendor_net ledger entry now linked to the payout',
  (select payout_id is not null from public.financial_ledger where vendor_id='10000000-0000-0000-0000-0000000000c1' and entry_type='vendor_net'));

-- Idempotent: a second run has nothing left to pay.
set role service_role;
select pg_temp.chk('second run creates nothing (no double pay)',
  (select count(*)=0 from public.process_due_payouts(0)));
reset role;

-- RLS: a stranger can't read the payout; the vendor owner can.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}';
select pg_temp.chk('stranger cannot read the payout', (select count(*)=0 from public.payouts));
select pg_temp.chk('stranger cannot read the payout account', (select count(*)=0 from public.vendor_payout_accounts));
reset role; reset request.jwt.claims;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select pg_temp.chk('vendor owner reads their own payout', (select count(*)=1 from public.payouts));
select pg_temp.chk('vendor owner reads their own payout account', (select count(*)=1 from public.vendor_payout_accounts));
reset role; reset request.jwt.claims;
