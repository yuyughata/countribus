-- ===========================================================================
-- vendor_staff_list — read an operator's staff roster (with profile names) for
-- the Admin & permissions page.
--
-- profiles RLS only lets a user read their own profile, so an owner/manager
-- cannot join staff names directly. This SECURITY DEFINER function returns the
-- roster for a vendor, but ONLY to a platform admin or that vendor's
-- owner/manager (checked on entry), so it exposes nothing RLS wouldn't already
-- allow that caller to act on.
-- ===========================================================================
create or replace function public.vendor_staff_list(p_vendor uuid)
returns table (user_id uuid, full_name text, email text, role public.vendor_role, is_active boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (
    public.is_platform_admin()
    or public.has_vendor_role(p_vendor, array['vendor_owner','vendor_manager']::public.vendor_role[])
  ) then
    raise exception 'not authorized';
  end if;
  return query
    select vs.user_id, p.full_name, p.email, vs.role, vs.is_active
    from public.vendor_staff vs
    left join public.profiles p on p.id = vs.user_id
    where vs.vendor_id = p_vendor
    order by vs.role, p.full_name;
end;
$$;
revoke all on function public.vendor_staff_list(uuid) from public, anon;
grant execute on function public.vendor_staff_list(uuid) to authenticated, service_role;
