-- ===========================================================================
-- Demo inventory: 10 routes, each with its own vehicle (40-seat 2+2 coach) and
-- three upcoming published departures, so Search returns live, bookable
-- results (and "Other routes" alternatives have something to show).
--
-- Idempotent: guarded by the demo vehicle registration numbers DEMO-R01..R10,
-- so re-running adds nothing. Seats/schedules are created by publish_schedule,
-- which we authorise by setting the JWT to the demo Super Admin inside this one
-- transaction (set_config ... is_local = true).
--
-- Seeds under the approved vendor "Chisco Express". Safe to run against the
-- linked project:  psql "$DATABASE_URL" -f supabase/seed_demo_routes.sql
-- ===========================================================================
do $$
declare
  v_vendor constant uuid := 'e0000000-0000-4000-8000-000000000001'; -- Chisco Express (approved)
  v_admin  constant uuid := 'd0000000-0000-4000-8000-000000000001'; -- Super Admin
  v_cat    uuid;
  v_rows   constant int := 10;
  v_cols   constant int := 4;   -- 2 + aisle + 2  →  40 seats
  routes   constant jsonb := jsonb_build_array(
    jsonb_build_object('n',1,'o','de8cc84b-7ef8-4dcc-a437-74d36d0decd0','d','c8ff3d8b-4f0e-4039-8295-7179e256f24d','name','Lagos → Abuja','fare',1500000,'addr','Jibowu Terminal, Yaba, Lagos','phone','+2348031000001'),
    jsonb_build_object('n',2,'o','de8cc84b-7ef8-4dcc-a437-74d36d0decd0','d','4b2554d8-f0d7-4b6c-b910-b6cfd93fe83f','name','Lagos → Ibadan','fare',500000,'addr','Jibowu Terminal, Yaba, Lagos','phone','+2348031000002'),
    jsonb_build_object('n',3,'o','de8cc84b-7ef8-4dcc-a437-74d36d0decd0','d','f9958086-7736-4189-9f90-d0368d0818d7','name','Lagos → Benin City','fare',1200000,'addr','Jibowu Terminal, Yaba, Lagos','phone','+2348031000003'),
    jsonb_build_object('n',4,'o','de8cc84b-7ef8-4dcc-a437-74d36d0decd0','d','1267f8b9-92a7-4c86-a3ff-23a55b0dae00','name','Lagos → Enugu','fare',1800000,'addr','Jibowu Terminal, Yaba, Lagos','phone','+2348031000004'),
    jsonb_build_object('n',5,'o','de8cc84b-7ef8-4dcc-a437-74d36d0decd0','d','5a886795-ad5a-46e5-9f68-8ca54244bfcb','name','Lagos → Port Harcourt','fare',2000000,'addr','Jibowu Terminal, Yaba, Lagos','phone','+2348031000005'),
    jsonb_build_object('n',6,'o','c8ff3d8b-4f0e-4039-8295-7179e256f24d','d','cdff068e-d8cd-48bd-9906-13e5aff15813','name','Abuja → Kaduna','fare',600000,'addr','Utako Motor Park, Abuja','phone','+2348031000006'),
    jsonb_build_object('n',7,'o','c8ff3d8b-4f0e-4039-8295-7179e256f24d','d','600c4936-516f-4e36-8956-5089b423194d','name','Abuja → Kano','fare',1400000,'addr','Utako Motor Park, Abuja','phone','+2348031000007'),
    jsonb_build_object('n',8,'o','c8ff3d8b-4f0e-4039-8295-7179e256f24d','d','45541e09-c172-442a-85fb-ad62d5c69247','name','Abuja → Jos','fare',900000,'addr','Utako Motor Park, Abuja','phone','+2348031000008'),
    jsonb_build_object('n',9,'o','1267f8b9-92a7-4c86-a3ff-23a55b0dae00','d','80b658f9-94e4-4895-b5fc-9f7cc4b31019','name','Enugu → Onitsha','fare',450000,'addr','Holy Ghost Terminal, Enugu','phone','+2348031000009'),
    jsonb_build_object('n',10,'o','5a886795-ad5a-46e5-9f68-8ca54244bfcb','d','3cfbb007-6947-4e43-ae78-41cc2efaef66','name','Port Harcourt → Owerri','fare',500000,'addr','Waterlines Terminal, Port Harcourt','phone','+2348031000010')
  );
  rt jsonb; reg text; veh uuid; tpl uuid; rid uuid; sched uuid;
  r int; c int; d int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
  select id into v_cat from public.vehicle_categories where key = 'luxury_coach';

  for rt in select value from jsonb_array_elements(routes) loop
    reg := 'DEMO-R' || lpad((rt->>'n'), 2, '0');
    if exists (select 1 from public.vehicles where vendor_id = v_vendor and registration_no = reg) then
      continue;
    end if;

    insert into public.vehicles(vendor_id, category_id, registration_no, display_name, capacity)
      values (v_vendor, v_cat, reg, 'Demo Coach ' || (rt->>'n'), v_rows * v_cols)
      returning id into veh;

    -- Create the layout unpublished, add seats, then publish it (a guard blocks
    -- editing seats of an already-published template).
    insert into public.seat_templates(vendor_id, vehicle_id, name, rows, columns, is_published)
      values (v_vendor, veh, 'Standard 2+2', v_rows, v_cols, false)
      returning id into tpl;

    for r in 1..v_rows loop
      for c in 1..v_cols loop
        insert into public.seat_template_seats(seat_template_id, seat_label, row, col)
          values (tpl, r::text || chr(64 + c), r, c);  -- 1A,1B,1C,1D … 10D
      end loop;
    end loop;

    update public.seat_templates set is_published = true where id = tpl;

    insert into public.routes(vendor_id, origin_terminal_id, destination_terminal_id, name)
      values (v_vendor, (rt->>'o')::uuid, (rt->>'d')::uuid, rt->>'name')
      returning id into rid;

    foreach d in array array[2, 4, 6] loop
      insert into public.schedules(
        vendor_id, route_id, vehicle_id, origin_terminal_id, destination_terminal_id,
        departure_at, arrival_estimate_at, base_fare_kobo, boarding_address, boarding_contact_phone, status)
      values (
        v_vendor, rid, veh, (rt->>'o')::uuid, (rt->>'d')::uuid,
        ((current_date + d) + time '07:30') at time zone 'Africa/Lagos',
        ((current_date + d) + time '07:30') at time zone 'Africa/Lagos' + interval '8 hours',
        (rt->>'fare')::bigint, rt->>'addr', rt->>'phone', 'draft')
      returning id into sched;
      perform public.publish_schedule(sched);
    end loop;
  end loop;
end $$;
