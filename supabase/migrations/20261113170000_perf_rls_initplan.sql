-- ===========================================================================
-- Phase 8 — Performance: RLS init-plan optimization.
--
-- Supabase advisor 0003 (auth_rls_initplan): when a policy calls auth.uid() or
-- a stable, argument-free helper directly, Postgres re-evaluates it per row.
-- Wrapping those calls in a scalar subselect — (select auth.uid()) — lets the
-- planner evaluate them ONCE per query (an InitPlan), which is materially
-- cheaper at scale.
--
-- This is semantics-preserving: a scalar subselect over a stable expression
-- matches exactly the same rows. Row-dependent helpers that take a column
-- argument (has_vendor_role(vendor_id,…), booking_passenger_vendor(…),
-- is_vendor_creator(vendor_id)) CANNOT be hoisted and are left unchanged.
-- Every policy below is recreated with its exact prior predicate, only the
-- argument-free auth.uid()/is_platform_admin() calls wrapped.
--
-- Tenant isolation / authz behaviour is unchanged and is re-verified by the
-- full tests/db/*.sql suites after this migration.
-- ===========================================================================

-- profiles -----------------------------------------------------------------
drop policy profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles for select to authenticated
  using ((id = (select auth.uid())) or (select public.is_platform_admin()));

drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- vendors (application insert) ---------------------------------------------
drop policy vendors_insert_application on public.vendors;
create policy vendors_insert_application on public.vendors for insert to authenticated
  with check ((created_by = (select auth.uid())) and (status = 'pending'::public.vendor_status));

-- vendor_staff -------------------------------------------------------------
drop policy vendor_staff_select on public.vendor_staff;
create policy vendor_staff_select on public.vendor_staff for select to authenticated
  using (
    (user_id = (select auth.uid()))
    or (vendor_id in (select public.current_vendor_ids()))
    or (select public.is_platform_admin())
  );

drop policy vendor_staff_insert on public.vendor_staff;
create policy vendor_staff_insert on public.vendor_staff for insert to authenticated
  with check (
    (select public.is_platform_admin())
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
    or ((user_id = (select auth.uid())) and (role = 'vendor_owner'::public.vendor_role) and public.is_vendor_creator(vendor_id))
  );

-- bookings -----------------------------------------------------------------
drop policy bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (
    ((created_by is not null) and (created_by = (select auth.uid())))
    or (select public.is_platform_admin())
    or (vendor_id in (select public.current_vendor_ids()))
  );

-- luggage_items ------------------------------------------------------------
drop policy luggage_items_select on public.luggage_items;
create policy luggage_items_select on public.luggage_items for select to authenticated
  using (
    (select public.is_platform_admin())
    or (public.booking_passenger_vendor(booking_passenger_id) in (select public.current_vendor_ids()))
    or (booking_passenger_id in (
      select bp.id from public.booking_passengers bp
      join public.bookings b on b.id = bp.booking_id
      where b.created_by = (select auth.uid())
    ))
  );

-- notifications ------------------------------------------------------------
drop policy notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using ((user_id = (select auth.uid())) or (select public.is_platform_admin()));

-- notification_preferences -------------------------------------------------
drop policy notif_prefs_all on public.notification_preferences;
create policy notif_prefs_all on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
