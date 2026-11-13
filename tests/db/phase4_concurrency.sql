\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- Setup: approved vendor, vehicle, published layout, route, published schedule.
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','o@a.ng');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000a1','A','a-p4','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000000a1'; reset role;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',cat,'P4-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('30000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-0000000000a1','L',1,3) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2),(tid,'1C',1,3);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('40000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',orig,dest,'L-A') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('50000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',rid,'20000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1200000);
  perform public.publish_schedule('50000000-0000-0000-0000-0000000000a1');
end $$;
reset role; reset request.jwt.claims;

-- As anon (a guest checkout): hold 2 seats.
set role anon;
do $$ declare s1 text; s2 text; exp timestamptz; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1B';
  exp := public.hold_seats('50000000-0000-0000-0000-0000000000a1', array[s1,s2], 'token-X', 10);
  raise notice 'PASS held 2 seats until %', exp::time;
exception when others then raise notice 'FAIL held 2 seats: %', sqlerrm; end $$;

-- A different session tries to hold seat 1A (already held) → must fail (no double allocation).
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000a1', array[s1], 'token-Y', 10);
  raise notice 'FAIL second session blocked from holding seat 1A';
exception when others then raise notice 'PASS second session blocked from holding seat 1A'; end $$;

select pg_temp.chk('2 seats held, 1 available', (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and state='held')=2);

-- Release token-X → seats free again.
do $$ begin perform public.release_hold('50000000-0000-0000-0000-0000000000a1','token-X'); end $$;
select pg_temp.chk('after release, 0 held', (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and state='held')=0);
reset role;

-- Expiry reconciliation: hold then force-expire, reconcile frees the seat.
set role anon;
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and seat_label='1C';
  perform public.hold_seats('50000000-0000-0000-0000-0000000000a1', array[s1], 'token-Z', 10);
end $$;
reset role;
-- force the hold into the past (as service role)
set role service_role;
update public.schedule_seats set held_until = now() - interval '1 minute' where schedule_id='50000000-0000-0000-0000-0000000000a1' and hold_token='token-Z';
reset role;
set role anon;
select pg_temp.chk('reconcile frees expired hold', public.reconcile_expired_holds('50000000-0000-0000-0000-0000000000a1')=1);
select pg_temp.chk('all 3 seats available after reconcile', (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and state='available')=3);

-- Search returns the schedule with available seats.
do $$ declare orig uuid; dest uuid; d date; n int; begin
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  select ((now()+interval '3 days') at time zone 'Africa/Lagos')::date into d;
  select count(*) into n from public.search_journeys(orig, dest, d, 2, null);
  raise notice '% search returns the published journey', case when n=1 then 'PASS' else 'FAIL' end;
end $$;
reset role;
