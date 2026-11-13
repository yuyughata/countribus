\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000ad','admin@x.ng'),
 ('00000000-0000-0000-0000-0000000000a1','ownerA@a.ng'),
 ('00000000-0000-0000-0000-0000000000a3','bofA@a.ng');
set role service_role; update public.profiles set is_platform_admin=true where id='00000000-0000-0000-0000-0000000000ad'; reset role;

-- Vendor A (owner + booking officer), approved.
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000a1','A','a-sch','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a3','booking_officer');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000000a1'; reset role;

-- Vehicle + published seat layout (3 sellable seats).
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; vid uuid; tid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity)
    values ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',cat,'SCH-1',30) returning id into vid;
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns)
    values ('30000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',vid,'L',1,3) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2),(tid,'1C',1,3);
  update public.seat_templates set is_published=true where id=tid;
end $$;

-- Route Lagos -> Abuja + a draft schedule.
do $$ declare orig uuid; dest uuid; rid uuid; begin
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name)
    values ('40000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',orig,dest,'Lagos-Abuja') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('50000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1',rid,'20000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '2 days', now()+interval '2 days 10 hours', 1500000);
  -- a second, overlapping schedule for the SAME vehicle
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('50000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000a1',rid,'20000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '2 days 3 hours', now()+interval '2 days 12 hours', 1500000);
end $$;
reset role; reset request.jwt.claims;

-- TEST: booking officer cannot publish
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
do $$ begin perform public.publish_schedule('50000000-0000-0000-0000-0000000000a1');
  raise notice 'FAIL booking officer blocked from publishing';
exception when others then raise notice 'PASS booking officer blocked from publishing'; end $$;
reset role; reset request.jwt.claims;

-- TEST: owner publishes schedule 1 → snapshot + inventory
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin perform public.publish_schedule('50000000-0000-0000-0000-0000000000a1');
  raise notice 'PASS owner published schedule 1';
exception when others then raise notice 'FAIL owner published schedule 1: %', sqlerrm; end $$;
select pg_temp.chk('schedule 1 is published with snapshot + capacity',
  (select status::text='published' and seat_template_version=1 and capacity=3 from public.schedules where id='50000000-0000-0000-0000-0000000000a1'));
select pg_temp.chk('inventory generated (3 available seats)',
  (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000000a1' and state='available')=3);

-- TEST: overlapping schedule 2 for same vehicle cannot publish (exclusion)
do $$ begin perform public.publish_schedule('50000000-0000-0000-0000-0000000000a2');
  raise notice 'FAIL overlapping vehicle schedule rejected';
exception when others then raise notice 'PASS overlapping vehicle schedule rejected'; end $$;
reset role; reset request.jwt.claims;

-- TEST: anon sees published schedule + its seats, not the draft
set role anon;
select pg_temp.chk('anon sees 1 published schedule', (select count(*) from public.schedules)=1);
select pg_temp.chk('anon sees published seat map', (select count(*) from public.schedule_seats)=3);
reset role;
