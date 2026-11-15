-- ===========================================================================
-- Staff sales incentives.
-- ===========================================================================
-- Owners configure fixed or percentage-based booking incentives (vendor-wide
-- and/or per staff member). When a staff-attributed booking (bookings.sold_by)
-- becomes paid, an incentive is accrued automatically; it reverses if the
-- booking is later cancelled/refunded while still unpaid-out. Owners approve and
-- record incentive payments, which settle outstanding accruals.
--
-- Money is integer kobo; percentage rates are basis points (0..10000), matching
-- the platform commission model. All amounts are computed server-side.

create type public.incentive_kind as enum ('fixed', 'percent');
create type public.incentive_status as enum ('pending', 'paid', 'reversed');

-- Effective-dated incentive rates. staff_id NULL = vendor-wide default; a row
-- with a staff_id overrides the default for that staff member.
create table public.staff_incentive_rules (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid not null references public.vendors (id) on delete cascade,
  staff_id       uuid references auth.users (id),
  kind           public.incentive_kind not null,
  fixed_kobo     bigint check (fixed_kobo is null or fixed_kobo >= 0),
  rate_bps       int check (rate_bps is null or (rate_bps between 0 and 10000)),
  effective_from timestamptz not null default now(),
  effective_to   timestamptz,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  check ((kind = 'fixed' and fixed_kobo is not null and rate_bps is null)
      or (kind = 'percent' and rate_bps is not null and fixed_kobo is null))
);
create index staff_incentive_rules_lookup
  on public.staff_incentive_rules (vendor_id, staff_id, effective_from desc);

-- Recorded incentive payouts to staff (settles outstanding accruals).
create table public.staff_incentive_payments (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendors (id) on delete cascade,
  staff_id    uuid not null references auth.users (id),
  amount_kobo bigint not null check (amount_kobo >= 0),
  note        text,
  approved_by uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index staff_incentive_payments_idx
  on public.staff_incentive_payments (vendor_id, staff_id, created_at desc);

-- Per-booking accruals (one per booking).
create table public.staff_incentives (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  vendor_id   uuid not null references public.vendors (id) on delete cascade,
  staff_id    uuid not null references auth.users (id),
  rule_id     uuid references public.staff_incentive_rules (id),
  basis_kobo  bigint not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  status      public.incentive_status not null default 'pending',
  payment_id  uuid references public.staff_incentive_payments (id),
  created_at  timestamptz not null default now(),
  reversed_at timestamptz,
  paid_at     timestamptz,
  unique (booking_id)
);
create index staff_incentives_staff_idx on public.staff_incentives (vendor_id, staff_id, status);

-- Resolve the active rule for a vendor+staff at a time: a staff-specific rule
-- wins over the vendor-wide default.
create or replace function public.resolve_staff_incentive_rule(
  p_vendor uuid, p_staff uuid, p_at timestamptz default now()
) returns public.staff_incentive_rules
language sql stable security definer set search_path = public as $$
  select r.* from public.staff_incentive_rules r
  where r.vendor_id = p_vendor
    and (r.staff_id = p_staff or r.staff_id is null)
    and r.effective_from <= p_at
    and (r.effective_to is null or r.effective_to > p_at)
  order by coalesce(r.staff_id = p_staff, false) desc, r.effective_from desc
  limit 1;
$$;
revoke all on function public.resolve_staff_incentive_rule(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.resolve_staff_incentive_rule(uuid, uuid, timestamptz) to service_role;

-- Accrue on paid; reverse a still-pending accrual on cancel/refund. Decoupled
-- from confirm_payment (a separate AFTER UPDATE trigger), so the money path is
-- untouched. Online bookings have sold_by = NULL and never accrue.
create or replace function public.accrue_staff_incentive() returns trigger
language plpgsql security definer set search_path = public as $$
declare rule public.staff_incentive_rules; amt bigint;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.sold_by is not null then
    if not exists (select 1 from public.staff_incentives where booking_id = new.id) then
      select * into rule from public.resolve_staff_incentive_rule(new.vendor_id, new.sold_by, now());
      if rule.id is not null then
        amt := case when rule.kind = 'fixed' then rule.fixed_kobo
                    else round(new.grand_total_kobo::numeric * rule.rate_bps / 10000) end;
        insert into public.staff_incentives
          (booking_id, vendor_id, staff_id, rule_id, basis_kobo, amount_kobo)
          values (new.id, new.vendor_id, new.sold_by, rule.id, new.grand_total_kobo, amt);
      end if;
    end if;
  end if;

  if new.status in ('cancelled', 'refunded') and old.status = 'paid' then
    update public.staff_incentives
      set status = 'reversed', reversed_at = now()
      where booking_id = new.id and status = 'pending';
  end if;

  return new;
end;
$$;
-- Trigger function: fires on the trigger regardless of EXECUTE, so it need not
-- be callable as an RPC.
revoke all on function public.accrue_staff_incentive() from public, anon, authenticated;
create trigger bookings_accrue_incentive
  after update of status on public.bookings
  for each row execute function public.accrue_staff_incentive();

-- Owner/admin: set a fixed or percentage incentive rate (vendor-wide when
-- p_staff is NULL, else for one staff member). Supersedes the current open rule.
create or replace function public.set_staff_incentive_rule(
  p_vendor uuid, p_staff uuid, p_kind public.incentive_kind,
  p_fixed_kobo bigint default null, p_rate_bps int default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (public.is_platform_admin()
          or public.has_vendor_role(p_vendor, array['vendor_owner']::public.vendor_role[])) then
    raise exception 'not authorized to set incentive rules for this operator';
  end if;
  if p_kind = 'fixed' and (p_fixed_kobo is null or p_fixed_kobo < 0) then
    raise exception 'a fixed incentive needs a non-negative amount';
  end if;
  if p_kind = 'percent' and (p_rate_bps is null or p_rate_bps < 0 or p_rate_bps > 10000) then
    raise exception 'a percentage incentive must be between 0 and 10000 bps';
  end if;
  if p_staff is not null and not exists (
    select 1 from public.vendor_staff where vendor_id = p_vendor and user_id = p_staff
  ) then
    raise exception 'that staff member does not belong to this operator';
  end if;

  update public.staff_incentive_rules set effective_to = now()
    where vendor_id = p_vendor and staff_id is not distinct from p_staff and effective_to is null;
  insert into public.staff_incentive_rules (vendor_id, staff_id, kind, fixed_kobo, rate_bps, created_by)
    values (p_vendor, p_staff, p_kind,
            case when p_kind = 'fixed' then p_fixed_kobo end,
            case when p_kind = 'percent' then p_rate_bps end,
            auth.uid())
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.set_staff_incentive_rule(uuid, uuid, public.incentive_kind, bigint, int) from public, anon;
grant execute on function public.set_staff_incentive_rule(uuid, uuid, public.incentive_kind, bigint, int) to authenticated, service_role;

-- Owner/admin: record a payment that settles a staff member's outstanding
-- (pending) incentive accruals. Amount is recomputed server-side.
create or replace function public.record_staff_incentive_payment(
  p_vendor uuid, p_staff uuid, p_note text default null
) returns table (payment_id uuid, amount_kobo bigint)
language plpgsql security definer set search_path = public as $$
declare v_pid uuid; v_total bigint;
begin
  if not (public.is_platform_admin()
          or public.has_vendor_role(p_vendor, array['vendor_owner']::public.vendor_role[])) then
    raise exception 'not authorized to record incentive payments for this operator';
  end if;
  select coalesce(sum(si.amount_kobo), 0) into v_total from public.staff_incentives si
    where si.vendor_id = p_vendor and si.staff_id = p_staff and si.status = 'pending';
  if v_total = 0 then raise exception 'no outstanding incentive to pay'; end if;

  insert into public.staff_incentive_payments (vendor_id, staff_id, amount_kobo, note, approved_by)
    values (p_vendor, p_staff, v_total, p_note, auth.uid()) returning id into v_pid;
  update public.staff_incentives si set status = 'paid', paid_at = now(), payment_id = v_pid
    where si.vendor_id = p_vendor and si.staff_id = p_staff and si.status = 'pending';
  return query select v_pid, v_total;
end;
$$;
revoke all on function public.record_staff_incentive_payment(uuid, uuid, text) from public, anon;
grant execute on function public.record_staff_incentive_payment(uuid, uuid, text) to authenticated, service_role;

-- Per-staff sales + incentive balances for a vendor (owner/manager/finance/admin).
create or replace function public.staff_sales_performance(p_vendor uuid)
returns table (
  staff_id uuid, staff_name text, sales_count bigint, gross_sold_kobo bigint,
  incentive_pending_kobo bigint, incentive_paid_kobo bigint, incentive_total_kobo bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_platform_admin()
          or public.has_vendor_role(p_vendor,
               array['vendor_owner','vendor_manager','finance_officer']::public.vendor_role[])) then
    raise exception 'not authorized';
  end if;
  return query
  with sales as (
    select b.sold_by as sid, count(*)::bigint cnt, coalesce(sum(b.grand_total_kobo), 0)::bigint gross
    from public.bookings b
    where b.vendor_id = p_vendor and b.status = 'paid' and b.sold_by is not null
    group by b.sold_by
  ), inc as (
    select si.staff_id sid,
      coalesce(sum(si.amount_kobo) filter (where si.status = 'pending'), 0)::bigint pend,
      coalesce(sum(si.amount_kobo) filter (where si.status = 'paid'), 0)::bigint paid
    from public.staff_incentives si where si.vendor_id = p_vendor group by si.staff_id
  )
  select s.sid,
    coalesce(pr.full_name, u.email, 'Staff'),
    s.cnt, s.gross,
    coalesce(i.pend, 0), coalesce(i.paid, 0), coalesce(i.pend, 0) + coalesce(i.paid, 0)
  from sales s
  left join inc i on i.sid = s.sid
  left join public.profiles pr on pr.id = s.sid
  left join auth.users u on u.id = s.sid
  order by s.gross desc;
end;
$$;
revoke all on function public.staff_sales_performance(uuid) from public, anon;
grant execute on function public.staff_sales_performance(uuid) to authenticated, service_role;

-- Grants + RLS --------------------------------------------------------------
grant select on public.staff_incentive_rules, public.staff_incentives,
  public.staff_incentive_payments to authenticated;
grant all on public.staff_incentive_rules, public.staff_incentives,
  public.staff_incentive_payments to service_role;

alter table public.staff_incentive_rules enable row level security;
alter table public.staff_incentives enable row level security;
alter table public.staff_incentive_payments enable row level security;

-- Platform admin + the owning vendor's members may read. Writes go through the
-- SECURITY DEFINER functions above (no direct insert/update policy).
create policy staff_incentive_rules_select on public.staff_incentive_rules for select to authenticated
  using (public.is_platform_admin() or vendor_id in (select public.current_vendor_ids()));
create policy staff_incentives_select on public.staff_incentives for select to authenticated
  using (public.is_platform_admin() or vendor_id in (select public.current_vendor_ids()));
create policy staff_incentive_payments_select on public.staff_incentive_payments for select to authenticated
  using (public.is_platform_admin() or vendor_id in (select public.current_vendor_ids()));

notify pgrst, 'reload schema';
