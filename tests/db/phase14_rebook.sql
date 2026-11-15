\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- ===========================================================================
-- Rebook-after-cancel suite.
--   * a seat can be booked, cancelled (seat freed), and booked AGAIN
--   * concurrency still holds: a seat held by an active hold cannot be taken
-- Fixed IDs; expects a FRESH database (harness + all migrations).
-- ===========================================================================

insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','o@ex.ng');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('11000000-0000-0000-0000-0000000000a1','RbA','rb-a','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('11000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
reset role; reset request.jwt.claims;
set role service_role; update public.vendors set status='approved' where id='11000000-0000-0000-0000-0000000000a1'; reset role;

set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; tid uuid; orig uuid; dest uuid; rid uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(id,vendor_id,category_id,registration_no,capacity) values ('22000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',cat,'RB-1',30);
  insert into public.seat_templates(id,vendor_id,vehicle_id,name,rows,columns) values ('33000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1','22000000-0000-0000-0000-0000000000a1','L',1,2) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1),(tid,'1B',1,2);
  update public.seat_templates set is_published=true where id=tid;
  select id into orig from public.terminals where name='Jibowu Terminal';
  select id into dest from public.terminals where name='Utako Motor Park';
  insert into public.routes(id,vendor_id,origin_terminal_id,destination_terminal_id,name) values ('44000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',orig,dest,'RB') returning id into rid;
  insert into public.schedules(id,vendor_id,route_id,vehicle_id,origin_terminal_id,destination_terminal_id,departure_at,arrival_estimate_at,base_fare_kobo)
    values ('55000000-0000-0000-0000-0000000000a1','11000000-0000-0000-0000-0000000000a1',rid,'22000000-0000-0000-0000-0000000000a1',orig,dest, now()+interval '3 days', now()+interval '3 days 9 hours', 1000000);
  perform public.publish_schedule('55000000-0000-0000-0000-0000000000a1');
end $$;
reset role; reset request.jwt.claims;

-- Book seat 1A, then cancel it (frees the seat).
set role anon;
do $$ declare s1 text; bk uuid; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.hold_seats('55000000-0000-0000-0000-0000000000a1', array[s1], 'tok-1', 10);
  select booking_id into bk from public.create_booking_from_hold(
    '55000000-0000-0000-0000-0000000000a1','tok-1',
    '{"name":"A","phone":"+2348030000001"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','A One')));
  perform set_config('my.bk1', bk::text, false);
end $$;
reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin perform public.cancel_booking(current_setting('my.bk1')::uuid, 'free it'); end $$;
reset role; reset request.jwt.claims;
select pg_temp.chk('seat 1A is available again after cancel',
  (select state='available' from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A'));

-- Rebook seat 1A (previously impossible due to the dropped constraint).
set role anon;
do $$ declare s1 text; bk uuid; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.hold_seats('55000000-0000-0000-0000-0000000000a1', array[s1], 'tok-2', 10);
  select booking_id into bk from public.create_booking_from_hold(
    '55000000-0000-0000-0000-0000000000a1','tok-2',
    '{"name":"B","phone":"+2348030000002"}'::jsonb,
    jsonb_build_array(jsonb_build_object('seat_id',s1,'full_name','B One')));
  raise notice 'PASS seat 1A rebooked after cancel';
exception when others then raise notice 'FAIL rebook after cancel: %', sqlerrm; end $$;
reset role;

-- Concurrency still enforced: a second hold of the now-held seat 1A fails.
set role anon;
do $$ declare s1 text; begin
  select seat_id into s1 from public.schedule_seats where schedule_id='55000000-0000-0000-0000-0000000000a1' and seat_label='1A';
  perform public.hold_seats('55000000-0000-0000-0000-0000000000a1', array[s1], 'tok-3', 10);
  raise notice 'FAIL double-hold blocked (unexpected success)';
exception when others then raise notice 'PASS seat still cannot be double-held: %', sqlerrm; end $$;
reset role;
