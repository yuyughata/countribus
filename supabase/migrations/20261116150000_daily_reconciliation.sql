-- ===========================================================================
-- Daily reconciliation.
-- ===========================================================================
-- Read-only aggregates over existing data (bookings, financial_ledger,
-- payment_transactions, schedules/vehicles). Day windows are computed in
-- Africa/Lagos. Revenue is recognised on the paid event (the booking_gross
-- ledger entry's timestamp). Duplicate seat allocation and duplicate payment
-- records are already prevented structurally (schedule_seats partial unique
-- index; payment_transactions unique(provider, provider_reference);
-- webhook_events idempotency) — reconciliation surfaces any integrity gaps as
-- "unreconciled".
--
-- Authorization: platform admin for the platform-wide view (p_vendor NULL);
-- otherwise the vendor's owner or finance officer (or admin) for one vendor.

create or replace function public._recon_authorized(p_vendor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_vendor is null then public.is_platform_admin()
    else public.is_platform_admin()
         or public.has_vendor_role(p_vendor, array['vendor_owner','finance_officer']::public.vendor_role[])
  end;
$$;
revoke all on function public._recon_authorized(uuid) from public, anon, authenticated;
grant execute on function public._recon_authorized(uuid) to service_role;

-- One-row daily summary. p_vendor NULL = platform-wide (admin only).
create or replace function public.reconciliation_summary(p_vendor uuid, p_date date)
returns table (
  online_bookings bigint, online_revenue_kobo bigint,
  walkin_bookings bigint, walkin_revenue_kobo bigint,
  total_bookings bigint, total_revenue_kobo bigint,
  passengers bigint, commission_kobo bigint, vendor_net_kobo bigint,
  unreconciled bigint
)
language plpgsql stable security definer set search_path = public as $$
declare d_start timestamptz; d_end timestamptz;
begin
  if not public._recon_authorized(p_vendor) then raise exception 'not authorized'; end if;
  d_start := (p_date::text || ' 00:00')::timestamp at time zone 'Africa/Lagos';
  d_end := ((p_date + 1)::text || ' 00:00')::timestamp at time zone 'Africa/Lagos';

  return query
  with gross as (
    select fl.booking_id, fl.amount_kobo, b.channel, b.passenger_count
    from public.financial_ledger fl
    join public.bookings b on b.id = fl.booking_id
    where fl.entry_type = 'booking_gross'
      and fl.created_at >= d_start and fl.created_at < d_end
      and (p_vendor is null or fl.vendor_id = p_vendor)
  ), comm as (
    select coalesce(sum(case when fl.entry_type = 'platform_commission' then -fl.amount_kobo else 0 end), 0)::bigint c,
           coalesce(sum(case when fl.entry_type = 'vendor_net' then fl.amount_kobo else 0 end), 0)::bigint n
    from public.financial_ledger fl
    where fl.entry_type in ('platform_commission','vendor_net')
      and fl.created_at >= d_start and fl.created_at < d_end
      and (p_vendor is null or fl.vendor_id = p_vendor)
  ), unrec as (
    -- Integrity gaps: a successful payment whose booking is not paid.
    select count(*)::bigint u
    from public.payment_transactions pt
    join public.bookings b on b.id = pt.booking_id
    where pt.status = 'success' and b.status <> 'paid'
      and pt.verified_at >= d_start and pt.verified_at < d_end
      and (p_vendor is null or b.vendor_id = p_vendor)
  )
  select
    coalesce(count(*) filter (where g.channel = 'online'), 0)::bigint,
    coalesce(sum(g.amount_kobo) filter (where g.channel = 'online'), 0)::bigint,
    coalesce(count(*) filter (where g.channel = 'walk_in'), 0)::bigint,
    coalesce(sum(g.amount_kobo) filter (where g.channel = 'walk_in'), 0)::bigint,
    coalesce(count(*), 0)::bigint,
    coalesce(sum(g.amount_kobo), 0)::bigint,
    coalesce(sum(g.passenger_count), 0)::bigint,
    (select c from comm), (select n from comm),
    (select u from unrec)
  from gross g;
end;
$$;
revoke all on function public.reconciliation_summary(uuid, date) from public, anon;
grant execute on function public.reconciliation_summary(uuid, date) to authenticated, service_role;

-- Passenger totals per vehicle for the day's departures (one vendor).
create or replace function public.reconciliation_vehicles(p_vendor uuid, p_date date)
returns table (
  vehicle_id uuid, registration_no text, display_name text,
  departures bigint, passengers bigint, capacity int
)
language plpgsql stable security definer set search_path = public as $$
declare d_start timestamptz; d_end timestamptz;
begin
  if p_vendor is null or not public._recon_authorized(p_vendor) then raise exception 'not authorized'; end if;
  d_start := (p_date::text || ' 00:00')::timestamp at time zone 'Africa/Lagos';
  d_end := ((p_date + 1)::text || ' 00:00')::timestamp at time zone 'Africa/Lagos';

  return query
  select veh.id, veh.registration_no, veh.display_name,
    count(distinct s.id)::bigint,
    count(bp.id)::bigint,
    veh.capacity
  from public.schedules s
  join public.vehicles veh on veh.id = s.vehicle_id
  left join public.bookings b on b.schedule_id = s.id and b.status = 'paid'
  left join public.booking_passengers bp on bp.booking_id = b.id
  where s.vendor_id = p_vendor
    and s.departure_at >= d_start and s.departure_at < d_end
  group by veh.id, veh.registration_no, veh.display_name, veh.capacity
  order by veh.registration_no;
end;
$$;
revoke all on function public.reconciliation_vehicles(uuid, date) from public, anon;
grant execute on function public.reconciliation_vehicles(uuid, date) to authenticated, service_role;

-- Detail of unreconciled transactions for the day (integrity review).
create or replace function public.reconciliation_unreconciled(p_vendor uuid, p_date date)
returns table (
  reference text, provider public.payment_provider, amount_kobo bigint,
  payment_status public.payment_status, booking_status public.booking_status, verified_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare d_start timestamptz; d_end timestamptz;
begin
  if not public._recon_authorized(p_vendor) then raise exception 'not authorized'; end if;
  d_start := (p_date::text || ' 00:00')::timestamp at time zone 'Africa/Lagos';
  d_end := ((p_date + 1)::text || ' 00:00')::timestamp at time zone 'Africa/Lagos';

  return query
  select b.reference, pt.provider, pt.amount_kobo, pt.status, b.status, pt.verified_at
  from public.payment_transactions pt
  join public.bookings b on b.id = pt.booking_id
  where pt.status = 'success' and b.status <> 'paid'
    and pt.verified_at >= d_start and pt.verified_at < d_end
    and (p_vendor is null or b.vendor_id = p_vendor)
  order by pt.verified_at desc;
end;
$$;
revoke all on function public.reconciliation_unreconciled(uuid, date) from public, anon;
grant execute on function public.reconciliation_unreconciled(uuid, date) to authenticated, service_role;

notify pgrst, 'reload schema';
