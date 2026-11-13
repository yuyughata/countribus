-- ===========================================================================
-- Phase 1 — Harden function privileges (addresses Supabase security advisors).
-- ===========================================================================
-- - Pin the one function with a mutable search_path.
-- - Stop anon/PUBLIC from executing SECURITY DEFINER helpers via PostgREST RPC.
--   RLS requires the *calling* role to hold EXECUTE on functions used inside a
--   policy, so the four policy helpers keep EXECUTE for `authenticated` (and
--   `service_role`, since the SECURITY INVOKER guard triggers call them). The
--   two trigger-only SECURITY DEFINER functions need no caller EXECUTE at all.

-- Pin search_path (function only uses now() from pg_catalog).
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger-only functions: never callable through the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.audit_vendor_status() from public, anon, authenticated;

-- RLS helper functions: authenticated (+ service_role) only; never anon/PUBLIC.
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.current_vendor_ids() from public, anon;
revoke all on function public.has_vendor_role(uuid, public.vendor_role[]) from public, anon;
revoke all on function public.is_vendor_creator(uuid) from public, anon;

grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.current_vendor_ids() to authenticated, service_role;
grant execute on function public.has_vendor_role(uuid, public.vendor_role[]) to authenticated, service_role;
grant execute on function public.is_vendor_creator(uuid) to authenticated, service_role;
