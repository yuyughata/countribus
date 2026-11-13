-- ===========================================================================
-- Phase 6 — Luggage declaration, QR luggage tags, boarding & ticket verify.
-- ===========================================================================

create type public.luggage_type as enum
  ('handbag', 'small_bag', 'medium_bag', 'large_bag', 'suitcase', 'carton', 'sack', 'other');
create type public.luggage_event_kind as enum
  ('accepted', 'loaded', 'unloaded', 'returned', 'exception');
create type public.boarding_event_kind as enum ('checked_in', 'boarded', 'no_show');

create table public.luggage_policies (
  vendor_id              uuid primary key references public.vendors (id) on delete cascade,
  free_bags              int not null default 1,
  fee_per_extra_bag_kobo bigint not null default 50000,
  max_weight_kg          numeric,
  prohibited_items       jsonb not null default '[]'::jsonb,
  updated_at             timestamptz not null default now()
);

create table public.luggage_items (
  id                  uuid primary key default gen_random_uuid(),
  booking_passenger_id uuid not null references public.booking_passengers (id) on delete cascade,
  type                public.luggage_type not null,
  quantity            int not null default 1 check (quantity > 0),
  weight_kg           numeric,
  dimensions          text,
  photo_path          text,
  handling_notes      text,
  fee_kobo            bigint not null default 0,
  created_at          timestamptz not null default now()
);
create index luggage_items_bp_idx on public.luggage_items (booking_passenger_id);

create table public.luggage_tags (
  id              uuid primary key default gen_random_uuid(),
  luggage_item_id uuid not null references public.luggage_items (id) on delete cascade,
  code            text not null unique default encode(gen_random_bytes(10), 'hex'),
  issued_at       timestamptz not null default now()
);

create table public.luggage_events (
  id            uuid primary key default gen_random_uuid(),
  luggage_tag_id uuid not null references public.luggage_tags (id) on delete cascade,
  event         public.luggage_event_kind not null,
  actor_id      uuid references auth.users (id),
  terminal_id   uuid references public.terminals (id),
  notes         text,
  created_at    timestamptz not null default now()
);
create index luggage_events_tag_idx on public.luggage_events (luggage_tag_id);

create table public.boarding_events (
  id                   uuid primary key default gen_random_uuid(),
  booking_passenger_id uuid not null references public.booking_passengers (id) on delete cascade,
  schedule_id          uuid not null references public.schedules (id) on delete cascade,
  event                public.boarding_event_kind not null,
  actor_id             uuid references auth.users (id),
  terminal_id          uuid references public.terminals (id),
  created_at           timestamptz not null default now()
);
create index boarding_events_schedule_idx on public.boarding_events (schedule_id);

-- Vendor of a booking_passenger (definer; used by scan functions + RLS).
create or replace function public.booking_passenger_vendor(p_bp uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select b.vendor_id from public.booking_passengers bp join public.bookings b on b.id = bp.booking_id where bp.id = p_bp;
$$;
revoke all on function public.booking_passenger_vendor(uuid) from public, anon;
grant execute on function public.booking_passenger_vendor(uuid) to authenticated, service_role;

-- Declare luggage on a pending booking; prices it from the vendor policy and
-- updates the booking total. Generates a luggage tag per bag.
create or replace function public.declare_luggage(p_booking uuid, p_items jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_vendor uuid; v_status public.booking_status; free_bags int; fee_each bigint;
        total_fee bigint := 0; counts jsonb := '{}'::jsonb; it jsonb; seat text; bpid uuid; li uuid; i int; n int;
begin
  select vendor_id, status into v_vendor, v_status from public.bookings where id = p_booking for update;
  if v_vendor is null then raise exception 'booking not found'; end if;
  if v_status <> 'pending_payment' then raise exception 'luggage can only be declared before payment'; end if;

  select coalesce(lp.free_bags, 1), coalesce(lp.fee_per_extra_bag_kobo, 50000)
    into free_bags, fee_each from (select 1) s
    left join public.luggage_policies lp on lp.vendor_id = v_vendor;
  free_bags := coalesce(free_bags, 1); fee_each := coalesce(fee_each, 50000);

  -- wipe any prior declaration for this booking (re-declare is idempotent)
  delete from public.luggage_items where booking_passenger_id in
    (select id from public.booking_passengers where booking_id = p_booking);

  -- Free allowance applies PER PASSENGER (counts tracked per seat).
  for it in select jsonb_array_elements(p_items) loop
    seat := it->>'seat_id';
    select id into bpid from public.booking_passengers where booking_id = p_booking and seat_id = seat;
    if bpid is null then continue; end if;
    for i in 1..coalesce((it->>'quantity')::int, 1) loop
      n := coalesce((counts->>seat)::int, 0) + 1;
      counts := jsonb_set(counts, array[seat], to_jsonb(n));
      insert into public.luggage_items (booking_passenger_id, type, quantity, fee_kobo)
        values (bpid, (it->>'type')::public.luggage_type, 1,
                case when n > free_bags then fee_each else 0 end)
        returning id into li;
      insert into public.luggage_tags (luggage_item_id) values (li);
      if n > free_bags then total_fee := total_fee + fee_each; end if;
    end loop;
  end loop;

  update public.bookings
    set luggage_fee_kobo = total_fee,
        grand_total_kobo = total_fare_kobo + total_fee - discount_kobo
    where id = p_booking;
  return total_fee;
end;
$$;
revoke all on function public.declare_luggage(uuid, jsonb) from public;
grant execute on function public.declare_luggage(uuid, jsonb) to anon, authenticated, service_role;

-- Verify a ticket by its QR token (public). Returns validity + display info.
create or replace function public.verify_ticket(p_qr_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t record;
begin
  select td.status as ticket_status, b.status as booking_status, b.reference,
         p.full_name, bp.seat_label, bp.boarding_status,
         s.departure_at, ot.name as origin, dt.name as destination, v.name as vendor
    into t
  from public.ticket_documents td
  join public.bookings b on b.id = td.booking_id
  join public.passengers p on p.id = td.passenger_id
  join public.booking_passengers bp on bp.booking_id = b.id and bp.passenger_id = td.passenger_id
  join public.schedules s on s.id = td.schedule_id
  join public.vendors v on v.id = b.vendor_id
  join public.terminals ot on ot.id = s.origin_terminal_id
  join public.terminals dt on dt.id = s.destination_terminal_id
  where td.qr_token = p_qr_token;

  if t is null then return jsonb_build_object('valid', false, 'reason', 'not found'); end if;
  return jsonb_build_object(
    'valid', (t.ticket_status = 'active' and t.booking_status = 'paid'),
    'ticket_status', t.ticket_status,
    'booking_status', t.booking_status,
    'reference', t.reference,
    'passenger', t.full_name,
    'seat', t.seat_label,
    'boarding_status', t.boarding_status,
    'vendor', t.vendor,
    'origin', t.origin,
    'destination', t.destination,
    'departure_at', t.departure_at
  );
end;
$$;
revoke all on function public.verify_ticket(text) from public;
grant execute on function public.verify_ticket(text) to anon, authenticated, service_role;

-- Terminal staff / booking officer / owner / manager records boarding.
create or replace function public.record_boarding(p_bp uuid, p_event public.boarding_event_kind, p_terminal uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_vendor uuid; v_bstatus public.booking_status; v_sched uuid;
begin
  select public.booking_passenger_vendor(p_bp) into v_vendor;
  if v_vendor is null then raise exception 'passenger not found'; end if;
  if not (public.is_platform_admin()
          or public.has_vendor_role(v_vendor, array['vendor_owner','vendor_manager','booking_officer','terminal_staff']::public.vendor_role[])) then
    raise exception 'not authorized to record boarding';
  end if;
  select b.status, bp.schedule_id into v_bstatus, v_sched
    from public.booking_passengers bp join public.bookings b on b.id = bp.booking_id where bp.id = p_bp;
  if v_bstatus <> 'paid' then raise exception 'only paid bookings can board'; end if;
  update public.booking_passengers set boarding_status = p_event::text::public.boarding_status
    where id = p_bp;
  insert into public.boarding_events (booking_passenger_id, schedule_id, event, actor_id, terminal_id)
    values (p_bp, v_sched, p_event, auth.uid(), p_terminal);
end;
$$;
revoke all on function public.record_boarding(uuid, public.boarding_event_kind, uuid) from public, anon;
grant execute on function public.record_boarding(uuid, public.boarding_event_kind, uuid) to authenticated, service_role;

-- Luggage officer / terminal staff records a luggage scan event.
create or replace function public.record_luggage_event(p_tag uuid, p_event public.luggage_event_kind, p_terminal uuid default null, p_notes text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_vendor uuid;
begin
  select public.booking_passenger_vendor(li.booking_passenger_id) into v_vendor
    from public.luggage_tags lt join public.luggage_items li on li.id = lt.luggage_item_id where lt.id = p_tag;
  if v_vendor is null then raise exception 'luggage tag not found'; end if;
  if not (public.is_platform_admin()
          or public.has_vendor_role(v_vendor, array['vendor_owner','vendor_manager','luggage_officer','terminal_staff']::public.vendor_role[])) then
    raise exception 'not authorized to scan luggage';
  end if;
  insert into public.luggage_events (luggage_tag_id, event, actor_id, terminal_id, notes)
    values (p_tag, p_event, auth.uid(), p_terminal, p_notes);
end;
$$;
revoke all on function public.record_luggage_event(uuid, public.luggage_event_kind, uuid, text) from public, anon;
grant execute on function public.record_luggage_event(uuid, public.luggage_event_kind, uuid, text) to authenticated, service_role;

-- Grants + RLS -------------------------------------------------------------
grant select on public.luggage_items, public.luggage_tags, public.luggage_events,
  public.boarding_events, public.luggage_policies to authenticated;
grant insert, update, delete on public.luggage_policies to authenticated;
grant all on public.luggage_policies, public.luggage_items, public.luggage_tags,
  public.luggage_events, public.boarding_events to service_role;

alter table public.luggage_policies enable row level security;
alter table public.luggage_items enable row level security;
alter table public.luggage_tags enable row level security;
alter table public.luggage_events enable row level security;
alter table public.boarding_events enable row level security;

create policy luggage_policies_select on public.luggage_policies for select to authenticated
  using (public.is_platform_admin() or vendor_id in (select public.current_vendor_ids()));
create policy luggage_policies_manage on public.luggage_policies for all to authenticated
  using (public.is_platform_admin() or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]))
  with check (public.is_platform_admin() or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[]));

-- Luggage items/tags/events: readable by the booking owner + the vendor staff.
create policy luggage_items_select on public.luggage_items for select to authenticated
  using (
    public.is_platform_admin()
    or public.booking_passenger_vendor(booking_passenger_id) in (select public.current_vendor_ids())
    or booking_passenger_id in (
      select bp.id from public.booking_passengers bp join public.bookings b on b.id = bp.booking_id
      where b.created_by = auth.uid())
  );
create policy luggage_tags_select on public.luggage_tags for select to authenticated
  using (luggage_item_id in (select id from public.luggage_items));
create policy luggage_events_select on public.luggage_events for select to authenticated
  using (luggage_tag_id in (select id from public.luggage_tags));
create policy boarding_events_select on public.boarding_events for select to authenticated
  using (public.is_platform_admin() or public.schedule_vendor(schedule_id) in (select public.current_vendor_ids()));
