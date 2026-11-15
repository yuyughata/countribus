-- ===========================================================================
-- Team invitations — operators (owner/manager) invite staff by email and
-- assign a role. The invitee accepts via a tokenised link, which adds them to
-- vendor_staff with that role. Role editing itself already works through the
-- existing vendor_staff RLS (owner/manager update) + owner-mint guard.
-- ===========================================================================

create table public.vendor_invitations (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendors (id) on delete cascade,
  email       text not null check (email = lower(email)),
  role        public.vendor_role not null,
  token       text not null unique,
  invited_by  uuid references auth.users (id),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '14 days')
);

-- At most one *pending* invite per email per vendor.
create unique index vendor_invitations_pending_uq
  on public.vendor_invitations (vendor_id, email) where status = 'pending';
create index vendor_invitations_vendor_idx on public.vendor_invitations (vendor_id);

grant select, insert, update, delete on public.vendor_invitations to authenticated;
grant all on public.vendor_invitations to service_role;

alter table public.vendor_invitations enable row level security;

-- Owners/managers of the vendor (and platform admins) manage its invitations.
create policy vendor_invitations_rw on public.vendor_invitations
  for all to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner', 'vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner', 'vendor_manager']::public.vendor_role[])
  );

-- Preview an invitation from its token (the token is the secret). Lets the
-- accept page show which operator/role before the user commits.
create or replace function public.invitation_preview(p_token text)
returns table (vendor_name text, role public.vendor_role, email text, status text, expired boolean)
language sql stable security definer set search_path = public as $$
  select v.name, i.role, i.email, i.status, (i.expires_at < now())
  from public.vendor_invitations i
  join public.vendors v on v.id = i.vendor_id
  where i.token = p_token;
$$;
revoke all on function public.invitation_preview(text) from public, anon;
grant execute on function public.invitation_preview(text) to authenticated;

-- Accept a pending invitation: adds the current user to vendor_staff with the
-- invited role (upsert), but only when their account email matches the invite.
create or replace function public.accept_vendor_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv    public.vendor_invitations;
  uemail text;
begin
  if auth.uid() is null then
    raise exception 'INVITE:not_signed_in';
  end if;

  select * into inv from public.vendor_invitations
    where token = p_token and status = 'pending'
    limit 1;
  if inv.id is null then
    raise exception 'INVITE:not_found';
  end if;
  if inv.expires_at < now() then
    raise exception 'INVITE:expired';
  end if;

  select email into uemail from auth.users where id = auth.uid();
  if lower(coalesce(uemail, '')) <> inv.email then
    raise exception 'INVITE:email_mismatch';
  end if;

  insert into public.vendor_staff (vendor_id, user_id, role, is_active)
  values (inv.vendor_id, auth.uid(), inv.role, true)
  on conflict (vendor_id, user_id) do update
    set role = excluded.role, is_active = true;

  update public.vendor_invitations
    set status = 'accepted', accepted_at = now()
    where id = inv.id;

  return inv.vendor_id;
end;
$$;
revoke all on function public.accept_vendor_invitation(text) from public, anon;
grant execute on function public.accept_vendor_invitation(text) to authenticated;

notify pgrst, 'reload schema';
