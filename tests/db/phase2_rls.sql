\set ON_ERROR_STOP 0
\pset pager off
create or replace function pg_temp.chk(label text, cond boolean) returns void
language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;

-- Users: ownerA, mgrA (manager), bofA (booking officer), termA (terminal staff), ownerB
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','ownerA@a.ng'),
 ('00000000-0000-0000-0000-0000000000a2','mgrA@a.ng'),
 ('00000000-0000-0000-0000-0000000000a3','bofA@a.ng'),
 ('00000000-0000-0000-0000-0000000000a4','termA@a.ng'),
 ('00000000-0000-0000-0000-0000000000b1','ownerB@b.ng');

-- Vendor A (owner bootstraps), with staff of each role; Vendor B (owner).
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000a1','A','a-fleet','00000000-0000-0000-0000-0000000000a1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','vendor_owner');
insert into public.vendor_staff(vendor_id,user_id,role) values
 ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','vendor_manager'),
 ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a3','booking_officer'),
 ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a4','terminal_staff');
reset role; reset request.jwt.claims;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
insert into public.vendors(id,name,slug,created_by) values ('10000000-0000-0000-0000-0000000000b1','B','b-fleet','00000000-0000-0000-0000-0000000000b1');
insert into public.vendor_staff(vendor_id,user_id,role) values ('10000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','vendor_owner');
reset role; reset request.jwt.claims;

\set catq 'select id from public.vehicle_categories where key=''coaster'''

-- TEST: vendor_owner CAN create a vehicle
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(vendor_id,category_id,registration_no,capacity) values ('10000000-0000-0000-0000-0000000000a1',cat,'LAG-001',30);
  raise notice 'PASS vendor_owner can create a vehicle';
exception when others then raise notice 'FAIL vendor_owner can create a vehicle: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- TEST: vendor_manager CAN create a vehicle
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ declare cat uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(vendor_id,category_id,registration_no,capacity) values ('10000000-0000-0000-0000-0000000000a1',cat,'LAG-002',30);
  raise notice 'PASS vendor_manager can create a vehicle';
exception when others then raise notice 'FAIL vendor_manager can create a vehicle: %', sqlerrm; end $$;
reset role; reset request.jwt.claims;

-- TEST: booking_officer CANNOT create a vehicle (vehicle:manage restriction)
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
do $$ declare cat uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(vendor_id,category_id,registration_no,capacity) values ('10000000-0000-0000-0000-0000000000a1',cat,'LAG-003',30);
  raise notice 'FAIL booking_officer blocked from creating a vehicle';
exception when others then raise notice 'PASS booking_officer blocked from creating a vehicle'; end $$;
reset role; reset request.jwt.claims;

-- TEST: terminal_staff CANNOT create a vehicle
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';
do $$ declare cat uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(vendor_id,category_id,registration_no,capacity) values ('10000000-0000-0000-0000-0000000000a1',cat,'LAG-004',30);
  raise notice 'FAIL terminal_staff blocked from creating a vehicle';
exception when others then raise notice 'PASS terminal_staff blocked from creating a vehicle'; end $$;
reset role; reset request.jwt.claims;

-- TEST: terminal_staff CAN view the vendor's vehicles
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';
select pg_temp.chk('terminal_staff can view vendor vehicles', (select count(*) from public.vehicles) = 2);
reset role; reset request.jwt.claims;

-- TEST: owner A cannot create a vehicle for vendor B (cross-vendor)
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare cat uuid; begin
  select id into cat from public.vehicle_categories where key='coaster';
  insert into public.vehicles(vendor_id,category_id,registration_no,capacity) values ('10000000-0000-0000-0000-0000000000b1',cat,'XYZ-1',30);
  raise notice 'FAIL owner A blocked from creating vehicle for vendor B';
exception when others then raise notice 'PASS owner A blocked from creating vehicle for vendor B'; end $$;
reset role; reset request.jwt.claims;

-- TEST: published seat template is frozen
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ declare tid uuid; begin
  insert into public.seat_templates(vendor_id,name,rows,columns,is_published) values ('10000000-0000-0000-0000-0000000000a1','L1',8,4,false) returning id into tid;
  insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1A',1,1);
  update public.seat_templates set is_published=true where id=tid;
  begin
    insert into public.seat_template_seats(seat_template_id,seat_label,row,col) values (tid,'1B',1,2);
    raise notice 'FAIL published template seats are frozen';
  exception when others then raise notice 'PASS published template seats are frozen'; end;
end $$;
reset role; reset request.jwt.claims;

-- TEST: anon can read states, cities, active terminals
set role anon;
select pg_temp.chk('anon reads 37 states', (select count(*) from public.states)=37);
select pg_temp.chk('anon reads seeded terminals', (select count(*) from public.terminals)>=15);
reset role;
