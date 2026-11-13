-- ===========================================================================
-- Phase 1 — Audit log + automatic vendor approval/status audit.
-- ===========================================================================

create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users (id),
  vendor_id  uuid references public.vendors (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_vendor_idx on public.audit_logs (vendor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- Record vendor status transitions (approval, suspension, rejection).
create or replace function public.audit_vendor_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, vendor_id, action, entity, entity_id, metadata)
    values (
      auth.uid(),
      new.id,
      'vendor.status_changed',
      'vendor',
      new.id,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger vendors_audit_status
  after update on public.vendors
  for each row execute function public.audit_vendor_status();

-- Grants + RLS: audit logs are readable by platform admins and the vendor's
-- own members; rows are written only by triggers / service role.
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

alter table public.audit_logs enable row level security;

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (
    public.is_platform_admin()
    or (vendor_id is not null and vendor_id in (select public.current_vendor_ids()))
  );
