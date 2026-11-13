-- ===========================================================================
-- set_platform_commission — let a platform admin set the marketplace commission
-- percentage from the dashboard. confirm_payment() reads the most recent
-- platform rule (scope='platform', vendor_id is null, newest effective_from),
-- so this closes the current open rule and appends a new one. Admin-only,
-- audited. bps = percent * 100 (e.g. 12.5% = 1250 bps).
-- ===========================================================================
create or replace function public.set_platform_commission(p_bps int)
returns int
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;
  if p_bps < 0 or p_bps > 10000 then
    raise exception 'commission must be between 0%% and 100%%';
  end if;

  update public.commission_rules
    set effective_to = now()
    where scope = 'platform' and vendor_id is null and effective_to is null;

  insert into public.commission_rules (scope, vendor_id, rate_bps, basis, effective_from)
    values ('platform', null, p_bps, 'base_fare', now());

  insert into public.audit_logs (actor_id, action, entity, metadata)
    values (auth.uid(), 'commission.platform_updated', 'commission_rules',
            jsonb_build_object('rate_bps', p_bps));

  return p_bps;
end;
$$;
revoke all on function public.set_platform_commission(int) from public, anon;
grant execute on function public.set_platform_commission(int) to authenticated, service_role;
