\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- Setup: approved vendor, published schedule, paid booking (2 pax).
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','o@a.ng'),
 ('00000000-0000-0000-0000-0000000000d1','term@a.ng'),
 ('00000000-0000-0000-0000-0000000000c1','cust@a.ng');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000a1','A','a-p6','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000d1','terminal_staff');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000000a1'; reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',cat,'P6-1',30);
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

-- Customer holds, declares luggage, books, pays.
set role anon;
do $$ declare s1 text; s2 text; bk uuid; ref text; fee bigint; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1B';
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}',true);
  perform set_config('role','authenticated',true);
  perform public.hold_seats('50000000-0000-0000-0000-0000000000a1', array[s1,s2], 'tok-6', 10);
  select booking_id, reference into bk, ref from public.create_booking_from_hold('50000000-0000-0000-0000-0000000000a1','tok-6',
    '{"name":"C","phone":"+2348030000000"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','P1'), jsonb_build_object('seat_id',s2,'full_name','P2')));
  -- declare luggage: P1 has 3 bags (1 free, 2 charged @500), P2 has 1 (free)
  fee := public.declare_luggage(bk, jsonb_build_array(
    jsonb_build_object('seat_id',s1,'type','large_bag','quantity',3),
    jsonb_build_object('seat_id',s2,'type','small_bag','quantity',1)));
  raise notice '% luggage fee = 100000 (2 extra bags x 50000)', case when fee=100000 then 'PASS' else 'FAIL' end;
  perform set_config('role','service_role',true); perform set_config('request.jwt.claims','',true);
  insert into public.payment_transactions(booking_id,provider,provider_reference,amount_kobo) select bk,'paystack',ref,grand_total_kobo from public.bookings where id=bk;
  perform public.confirm_payment('paystack','evt6',ref,(select grand_total_kobo from public.bookings where id=bk));
end $$;
reset role;

select pg_temp.chk('grand total = fare 2,000,000 + luggage 100,000',
  (select grand_total_kobo=2100000 from public.bookings limit 1));
select pg_temp.chk('4 luggage tags generated',
  (select count(*) from public.luggage_tags lt join public.luggage_items li on li.id=lt.luggage_item_id)=4);

-- verify_ticket: valid for an active/paid ticket
do $$ declare tok text; r jsonb; begin
  set local role service_role;
  select qr_token into tok from public.ticket_documents limit 1;
  reset role;
  r := public.verify_ticket(tok);
  raise notice '% ticket verifies as valid', case when (r->>'valid')::bool then 'PASS' else 'FAIL' end;
  r := public.verify_ticket('nonexistent');
  raise notice '% unknown token invalid', case when (r->>'valid')::bool=false then 'PASS' else 'FAIL' end;
end $$;
reset role;

-- terminal staff can record boarding; booking officer at another vendor cannot (tested via role absence)
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$ declare bp uuid; begin
  select id into bp from public.booking_passengers limit 1;
  perform public.record_boarding(bp,'checked_in',null);
  raise notice 'PASS terminal staff recorded check-in';
exception when others then raise notice 'FAIL terminal staff check-in: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- outsider cannot verify-scan boarding
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ declare bp uuid; begin
  select id into bp from public.booking_passengers limit 1;
  perform public.record_boarding(bp,'boarded',null);
  raise notice 'FAIL customer blocked from boarding ops';
exception when others then raise notice 'PASS customer blocked from boarding ops'; end $$;
reset role; reset request.jwt.claims;

-- manifest reconciliation: 2 paid passengers for the schedule
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select pg_temp.chk('manifest shows 2 passengers for the departure',
  (select count(*) from public.booking_passengers bp join public.bookings b on b.id=bp.booking_id
    where bp.schedule_id='50000000-0000-0000-0000-0000000000a1' and b.status='paid')=2);
reset role; reset request.jwt.claims;
