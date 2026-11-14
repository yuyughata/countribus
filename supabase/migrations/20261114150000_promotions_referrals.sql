-- ===========================================================================
-- Promotions & referrals
--
--  * promo_codes       — admin-created codes giving a % discount, with
--                        conditions (min fare, usage caps, validity window, an
--                        optional max-discount cap). Applied at checkout; the
--                        server recomputes the discount — the client never
--                        supplies a price or a discount.
--  * referral_program  — singleton config the admin controls: the % the
--                        REFERRER earns and the conditions that unlock it.
--  * profiles.referral_code — every customer gets a shareable code.
--  * referrals         — attribution: who referred whom + lifecycle
--                        (pending → qualified on the friend's first paid booking).
--  * referral_rewards  — the discount credits a referrer has earned, usable on
--                        their OWN next booking (consumed only when that booking
--                        is actually paid).
--
-- Money is integer kobo. Discounts apply to the seat fare (not luggage) and are
-- stored in bookings.discount_kobo; grand_total_kobo = fare + luggage − discount
-- (declare_luggage already honours discount_kobo).
-- ===========================================================================

-- ---------------------------------------------------------------- promo_codes
create table public.promo_codes (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code = upper(code) and length(code) between 3 and 32),
  description        text,
  discount_percent   int not null check (discount_percent between 1 and 100),
  min_fare_kobo      bigint not null default 0 check (min_fare_kobo >= 0),
  max_discount_kobo  bigint check (max_discount_kobo is null or max_discount_kobo > 0),
  max_redemptions    int check (max_redemptions is null or max_redemptions > 0),
  max_per_customer   int default 1 check (max_per_customer is null or max_per_customer > 0),
  starts_at          timestamptz,
  ends_at            timestamptz,
  is_active          boolean not null default true,
  created_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

grant select, insert, update, delete on public.promo_codes to authenticated;
grant all on public.promo_codes to service_role;
alter table public.promo_codes enable row level security;

-- Only platform admins touch the table directly. Customers never query it —
-- validation goes through promo_quote() (security definer), which bypasses RLS.
create policy promo_codes_admin on public.promo_codes for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ------------------------------------------------------------ referral_program
-- Single-row config (id is always true).
create table public.referral_program (
  id                       boolean primary key default true check (id),
  is_enabled               boolean not null default false,
  referrer_percent         int not null default 10 check (referrer_percent between 1 and 100),
  min_qualifying_fare_kobo bigint not null default 0 check (min_qualifying_fare_kobo >= 0),
  reward_max_discount_kobo bigint check (reward_max_discount_kobo is null or reward_max_discount_kobo > 0),
  reward_validity_days     int check (reward_validity_days is null or reward_validity_days > 0),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references auth.users (id)
);
insert into public.referral_program (id) values (true);

grant select on public.referral_program to anon, authenticated;
grant update on public.referral_program to authenticated;
grant all on public.referral_program to service_role;
alter table public.referral_program enable row level security;

-- Terms are public (shown on the account page); only admins change them.
create policy referral_program_select on public.referral_program for select using (true);
create policy referral_program_update on public.referral_program for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ----------------------------------------------------- profiles.referral_code
alter table public.profiles add column referral_code text unique;

-- Generate a short, unambiguous, unique referral code.
create or replace function public.gen_referral_code() returns text
language plpgsql as $$
declare v_code text;
begin
  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Backfill existing profiles (one at a time so the uniqueness check sees prior
-- rows written in this same transaction).
do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.gen_referral_code() where id = r.id;
  end loop;
end $$;

alter table public.profiles alter column referral_code set not null;

-- --------------------------------------------------------------- referrals
create table public.referrals (
  id                   uuid primary key default gen_random_uuid(),
  referrer_id          uuid not null references public.profiles (id) on delete cascade,
  referee_id           uuid not null unique references public.profiles (id) on delete cascade,
  code                 text not null,
  status               text not null default 'pending' check (status in ('pending', 'qualified')),
  qualifying_booking_id uuid references public.bookings (id) on delete set null,
  created_at           timestamptz not null default now(),
  qualified_at         timestamptz,
  check (referrer_id <> referee_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id);

grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;

-- A user can see referrals where they are either side; writes happen only
-- through security-definer code (signup trigger, paid-booking trigger).
create policy referrals_select on public.referrals for select to authenticated
  using (referrer_id = (select auth.uid()) or referee_id = (select auth.uid()));

-- ------------------------------------------------------------ referral_rewards
create table public.referral_rewards (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references public.profiles (id) on delete cascade,
  referral_id       uuid references public.referrals (id) on delete set null,
  discount_percent  int not null check (discount_percent between 1 and 100),
  max_discount_kobo bigint check (max_discount_kobo is null or max_discount_kobo > 0),
  status            text not null default 'available' check (status in ('available', 'used', 'expired')),
  expires_at        timestamptz,
  used_booking_id   uuid references public.bookings (id) on delete set null,
  used_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index referral_rewards_owner_idx on public.referral_rewards (referrer_id, status);

grant select on public.referral_rewards to authenticated;
grant all on public.referral_rewards to service_role;
alter table public.referral_rewards enable row level security;

-- Owner reads their own rewards; admins can read all. Writes via definer code.
create policy referral_rewards_select on public.referral_rewards for select to authenticated
  using (referrer_id = (select auth.uid()) or public.is_platform_admin());

-- -------------------------------------------------- bookings discount linkage
alter table public.bookings
  add column promo_code_id uuid references public.promo_codes (id) on delete set null,
  add column referral_reward_id uuid references public.referral_rewards (id) on delete set null;

-- ===========================================================================
-- Pricing helpers (security definer: callable by anon/authenticated for a
-- live quote, and reused inside create_booking_from_hold for the real charge).
-- ===========================================================================

-- Quote a promo code against a fare for a given user. reason is NULL when valid.
create or replace function public.promo_quote(p_code text, p_fare_kobo bigint, p_user uuid)
returns table (promo_id uuid, discount_kobo bigint, reason text)
language plpgsql security definer set search_path = public as $$
declare v_code text; pc record; used int; used_user int; disc bigint;
begin
  v_code := upper(trim(coalesce(p_code, '')));
  if v_code = '' then return query select null::uuid, 0::bigint, 'Enter a promo code'; return; end if;

  select * into pc from public.promo_codes where code = v_code;
  if not found then return query select null::uuid, 0::bigint, 'That promo code is not valid'; return; end if;
  if not pc.is_active then return query select null::uuid, 0::bigint, 'That promo code is no longer active'; return; end if;
  if pc.starts_at is not null and now() < pc.starts_at then
    return query select null::uuid, 0::bigint, 'That promo code is not active yet'; return; end if;
  if pc.ends_at is not null and now() > pc.ends_at then
    return query select null::uuid, 0::bigint, 'That promo code has expired'; return; end if;
  if p_fare_kobo < pc.min_fare_kobo then
    return query select null::uuid, 0::bigint,
      'This code needs a minimum fare of ' || to_char(pc.min_fare_kobo / 100.0, 'FM999,999,990.00') || ' NGN';
    return;
  end if;

  -- Usage caps: count bookings that still hold the code (pending or paid).
  select count(*) into used from public.bookings
    where promo_code_id = pc.id and status in ('pending_payment', 'paid');
  if pc.max_redemptions is not null and used >= pc.max_redemptions then
    return query select null::uuid, 0::bigint, 'That promo code has been fully redeemed'; return; end if;

  if p_user is not null and pc.max_per_customer is not null then
    select count(*) into used_user from public.bookings
      where promo_code_id = pc.id and created_by = p_user and status in ('pending_payment', 'paid');
    if used_user >= pc.max_per_customer then
      return query select null::uuid, 0::bigint, 'You have already used this promo code'; return; end if;
  end if;

  disc := least(round(p_fare_kobo::numeric * pc.discount_percent / 100)::bigint,
                coalesce(pc.max_discount_kobo, p_fare_kobo));
  return query select pc.id, greatest(disc, 0::bigint), null::text;
end;
$$;
revoke all on function public.promo_quote(text, bigint, uuid) from public;
grant execute on function public.promo_quote(text, bigint, uuid) to anon, authenticated, service_role;

-- Best available referral reward for a user, quoted against a fare.
create or replace function public.referral_reward_quote(p_user uuid, p_fare_kobo bigint)
returns table (reward_id uuid, discount_kobo bigint, discount_percent int)
language sql security definer set search_path = public as $$
  select id,
         least(round(p_fare_kobo::numeric * discount_percent / 100)::bigint, coalesce(max_discount_kobo, p_fare_kobo)),
         discount_percent
  from public.referral_rewards
  where referrer_id = p_user and status = 'available' and (expires_at is null or expires_at > now())
  order by discount_percent desc, created_at asc
  limit 1;
$$;
revoke all on function public.referral_reward_quote(uuid, bigint) from public;
grant execute on function public.referral_reward_quote(uuid, bigint) to anon, authenticated, service_role;

-- ===========================================================================
-- create_booking_from_hold — now accepts an optional promo code or a request to
-- apply the caller's referral reward. Discount is recomputed server-side.
-- ===========================================================================
drop function if exists public.create_booking_from_hold(uuid, text, jsonb, jsonb, jsonb);

create or replace function public.create_booking_from_hold(
  p_schedule uuid, p_hold_token text, p_contact jsonb, p_passengers jsonb,
  p_infants jsonb default '[]'::jsonb, p_promo_code text default null, p_use_referral_reward boolean default false
)
returns table (booking_id uuid, reference text)
language plpgsql security definer set search_path = public as $$
declare
  v_vendor uuid; v_fare bigint; n int; n_inf int; held int; bk uuid; ref text;
  pitem jsonb; pid uuid; st record; bpid uuid; seatfare bigint; base bigint;
  ptype public.passenger_type; total bigint := 0;
  v_uid uuid := auth.uid();
  v_promo uuid; v_reward uuid; v_discount bigint := 0; v_reason text;
begin
  select vendor_id, base_fare_kobo into v_vendor, v_fare from public.schedules where id = p_schedule and status = 'published';
  if v_vendor is null then raise exception 'schedule is not open for booking'; end if;

  n := coalesce(jsonb_array_length(p_passengers), 0);
  n_inf := coalesce(jsonb_array_length(p_infants), 0);
  if n = 0 then raise exception 'no seated passengers supplied'; end if;

  perform public.reconcile_expired_holds(p_schedule);
  select count(*) into held from public.schedule_seats where schedule_id = p_schedule and hold_token = p_hold_token and state = 'held';
  if held <> n then raise exception 'your seat hold has expired — please reselect your seats'; end if;

  ref := 'CB-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.bookings (reference, vendor_id, schedule_id, contact_name, contact_phone, contact_email, passenger_count, total_fare_kobo, grand_total_kobo, status, created_by, hold_token)
  values (ref, v_vendor, p_schedule, p_contact->>'name', p_contact->>'phone', p_contact->>'email', n + n_inf, 0, 0, 'pending_payment', v_uid, p_hold_token) returning id into bk;

  -- Seated passengers.
  for pitem in select jsonb_array_elements(p_passengers) loop
    ptype := coalesce(nullif(pitem->>'type', ''), 'adult')::public.passenger_type;
    if ptype = 'child_1_5' then
      raise exception 'a child aged 1–5 travels free on a lap and cannot hold a seat';
    end if;
    select * into st from public.schedule_seats where schedule_id = p_schedule and seat_id = (pitem->>'seat_id') and hold_token = p_hold_token and state = 'held';
    if st.seat_id is null then raise exception 'a selected seat is no longer held'; end if;

    base := v_fare + coalesce(st.surcharge_kobo, 0);
    seatfare := case when ptype = 'child_6_10' then round(base::numeric / 2) else base end;
    total := total + seatfare;

    insert into public.passengers (booking_id, full_name, phone, email) values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, st.seat_id, st.seat_label, seatfare, ptype) returning id into bpid;
    update public.schedule_seats set booking_passenger_id = bpid where schedule_id = p_schedule and seat_id = st.seat_id;
  end loop;

  -- Lap infants (free, no seat).
  for pitem in select jsonb_array_elements(p_infants) loop
    insert into public.passengers (booking_id, full_name, phone, email) values (bk, pitem->>'full_name', pitem->>'phone', pitem->>'email') returning id into pid;
    insert into public.booking_passengers (booking_id, passenger_id, schedule_id, seat_id, seat_label, fare_kobo, passenger_type)
      values (bk, pid, p_schedule, null, null, 0, 'child_1_5');
  end loop;

  -- Discount: a promo code takes precedence over a referral reward. Never both.
  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select promo_id, discount_kobo, reason into v_promo, v_discount, v_reason
      from public.promo_quote(p_promo_code, total, v_uid);
    if v_reason is not null then raise exception 'PROMO:%', v_reason; end if;
  elsif p_use_referral_reward and v_uid is not null then
    select reward_id, discount_kobo into v_reward, v_discount
      from public.referral_reward_quote(v_uid, total);
    if v_reward is null then v_discount := 0; end if;
  end if;
  if v_discount > total then v_discount := total; end if;

  update public.bookings
    set total_fare_kobo = total,
        discount_kobo = v_discount,
        grand_total_kobo = total - v_discount,
        promo_code_id = v_promo,
        referral_reward_id = v_reward
    where id = bk;

  insert into public.booking_status_history (booking_id, to_status, note) values (bk, 'pending_payment', 'created from hold');
  return query select bk, ref;
end;
$$;
revoke all on function public.create_booking_from_hold(uuid, text, jsonb, jsonb, jsonb, text, boolean) from public;
grant execute on function public.create_booking_from_hold(uuid, text, jsonb, jsonb, jsonb, text, boolean) to anon, authenticated, service_role;

-- ===========================================================================
-- When a booking is PAID: consume an applied referral reward, and grant the
-- referrer their reward on the referee's first paid booking.
-- ===========================================================================
create or replace function public.on_booking_paid() returns trigger
language plpgsql security definer set search_path = public as $$
declare prog record; v_ref record; v_exp timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    -- (1) Consume a referral reward that was applied to this booking.
    if new.referral_reward_id is not null then
      update public.referral_rewards
        set status = 'used', used_booking_id = new.id, used_at = now()
        where id = new.referral_reward_id and status = 'available';
    end if;

    -- (2) Grant the referrer their reward on the referee's first paid booking.
    select * into prog from public.referral_program where id = true;
    if prog.is_enabled and new.created_by is not null then
      select * into v_ref from public.referrals
        where referee_id = new.created_by and status = 'pending' limit 1;
      if found and new.grand_total_kobo >= coalesce(prog.min_qualifying_fare_kobo, 0) then
        update public.referrals
          set status = 'qualified', qualified_at = now(), qualifying_booking_id = new.id
          where id = v_ref.id;
        v_exp := case when prog.reward_validity_days is not null
                      then now() + make_interval(days => prog.reward_validity_days) else null end;
        insert into public.referral_rewards (referrer_id, referral_id, discount_percent, max_discount_kobo, expires_at)
          values (v_ref.referrer_id, v_ref.id, prog.referrer_percent, prog.reward_max_discount_kobo, v_exp);
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger bookings_on_paid
  after update of status on public.bookings
  for each row execute function public.on_booking_paid();

-- ===========================================================================
-- Extend handle_new_user: give every new profile a referral code and, when the
-- signup carried a referral code in its metadata, record the attribution.
-- ===========================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text; v_referrer uuid;
begin
  insert into public.profiles (id, email, full_name, phone, referral_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    public.gen_referral_code()
  )
  on conflict (id) do nothing;

  v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  if v_code <> '' then
    select id into v_referrer from public.profiles where referral_code = v_code and id <> new.id;
    if v_referrer is not null then
      insert into public.referrals (referrer_id, referee_id, code)
        values (v_referrer, new.id, v_code)
        on conflict (referee_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

comment on table public.promo_codes is 'Admin-created promo codes (% discount + conditions). Validated server-side via promo_quote().';
comment on table public.referral_program is 'Singleton config: the % a referrer earns and the conditions that unlock it.';
comment on table public.referrals is 'Referral attribution; pending → qualified on the referee''s first paid booking.';
comment on table public.referral_rewards is 'Discount credits a referrer earned, usable on their own next booking.';
