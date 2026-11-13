-- ===========================================================================
-- Passenger types — server-side fares & lap-infant rules.
-- Run on a FRESH DB (harness + all migrations). Every line must read PASS.
--   Adult = full fare · Child 6–10 = half (seated) · Child 1–5 = free (no seat)
-- ===========================================================================
\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(l text, c boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when c then 'PASS' else 'FAIL' end, l; end $$;

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000090a1','o@pt.ng'),
 ('00000000-0000-0000-0000-0000000090c1','c@pt.ng');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000090a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000090a1','PT','pt-v','00000000-0000-0000-0000-0000000090a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000090a1','00000000-0000-0000-0000-0000000090a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='10000000-0000-0000-0000-0000000090a1'; reset role;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000090a1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('20000000-0000-0000-0000-0000000090a1','10000000-0000-0000-0000-0000000090a1',cat,'PT-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('30000000-0000-0000-0000-0000000090a1','10000000-0000-0000-0000-0000000090a1','20000000-0000-0000-0000-0000000090a1','L',1,3) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2),(tid,'1C',1,3);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal'; select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('40000000-0000-0000-0000-0000000090a1','10000000-0000-0000-0000-0000000090a1',orig,dest,'L');
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo,boarding_address,boarding_contact_phone)
   values ('50000000-0000-0000-0000-0000000090a1','10000000-0000-0000-0000-0000000090a1','40000000-0000-0000-0000-0000000090a1','20000000-0000-0000-0000-0000000090a1',orig,dest,now()+interval '3 days',now()+interval '3 days 9 hours',1000000,'Addr','+234');
  perform public.publish_schedule('50000000-0000-0000-0000-0000000090a1');
end $$;
reset role; reset request.jwt.claims;

-- Book: seat 1A adult (full), seat 1B child 6–10 (half), + 1 lap infant (free).
set role anon;
do $$ declare s1 text; s2 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000090a1' and seat_label='1A';
  select seat_id into s2 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000090a1' and seat_label='1B';
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000090c1","role":"authenticated"}',true);
  perform set_config('role','authenticated',true);
  perform public.hold_seats('50000000-0000-0000-0000-0000000090a1', array[s1,s2], 'tok-pt', 10);
  perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000090a1','tok-pt',
    '{"name":"C","phone":"+234"}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('seat_id',s1,'full_name','Adult One','type','adult'),
      jsonb_build_object('seat_id',s2,'full_name','Kid Six','type','child_6_10')),
    jsonb_build_array(jsonb_build_object('full_name','Baby Lap')));
end $$;
reset role;

select pg_temp.chk('grand total = 1,500,000 (adult 1,000,000 + child6-10 500,000 + infant 0)',
  (select grand_total_kobo from public.bookings) = 1500000);
select pg_temp.chk('passenger_count = 3 (2 seated + 1 lap infant)',
  (select passenger_count from public.bookings) = 3);
select pg_temp.chk('adult fare = 1,000,000',
  (select fare_kobo from public.booking_passengers where passenger_type='adult') = 1000000);
select pg_temp.chk('child 6-10 fare = 500,000 (half)',
  (select fare_kobo from public.booking_passengers where passenger_type='child_6_10') = 500000);
select pg_temp.chk('lap infant: no seat, fare 0',
  (select count(*) from public.booking_passengers where passenger_type='child_1_5' and seat_id is null and fare_kobo=0) = 1);
select pg_temp.chk('only 2 seats consumed, 1 still available',
  (select count(*) from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000090a1' and state='available') = 1);

-- Negative: a seated passenger may not be typed child_1_5.
set role anon;
do $$ declare s3 text; begin
  select seat_id into s3 from public.schedule_seats where schedule_id='50000000-0000-0000-0000-0000000090a1' and seat_label='1C';
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000090c1","role":"authenticated"}',true);
  perform set_config('role','authenticated',true);
  perform public.hold_seats('50000000-0000-0000-0000-0000000090a1', array[s3], 'tok-x', 10);
  begin
    perform public.create_booking_from_hold('50000000-0000-0000-0000-0000000090a1','tok-x','{"name":"C","phone":"+234"}'::jsonb,
      jsonb_build_array(jsonb_build_object('seat_id',s3,'full_name','Bad','type','child_1_5')), '[]'::jsonb);
    raise notice 'FAIL seated child_1_5 is rejected';
  exception when others then raise notice 'PASS seated child_1_5 is rejected'; end;
end $$;
reset role;

-- Negative: the seat-type check constraint blocks a direct seated infant row.
set role service_role;
do $$ begin
  insert into public.booking_passengers(booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
    select b.id, p.id, '50000000-0000-0000-0000-0000000090a1', 'X', '9Z', 0, 'child_1_5'
    from public.bookings b, public.passengers p limit 1;
  raise notice 'FAIL check constraint blocks a seated lap-infant row';
exception when others then raise notice 'PASS check constraint blocks a seated lap-infant row'; end $$;
reset role;
