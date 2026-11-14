-- ===========================================================================
-- Vendor payouts (Paystack) — framework for automatic settlement to vendors.
--
--  * vendor_payout_accounts — a vendor's bank account for transfers. A Paystack
--    transfer-recipient code is cached once created.
--  * payouts — a settlement transfer to a vendor, batching the vendor's
--    unsettled `vendor_net` ledger entries. Driven to Paystack by the app.
--  * financial_ledger.payout_id — links the net entries settled by a payout.
--  * process_due_payouts() — sweeps unsettled vendor_net (for vendors with a
--    verified account) into scheduled payouts. A recurring job calls this so
--    vendors are paid within 24h of a booking; the app then initiates the
--    Paystack transfers for each scheduled payout.
-- Money is integer kobo.
-- ===========================================================================

-- ----------------------------------------------------- vendor_payout_accounts
create table public.vendor_payout_accounts (
  vendor_id               uuid primary key references public.vendors (id) on delete cascade,
  bank_name               text not null,
  bank_code               text not null,
  account_number          text not null check (account_number ~ '^[0-9]{10}$'),
  account_name            text not null,
  currency                text not null default 'NGN',
  paystack_recipient_code text,
  is_verified             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  updated_by              uuid references auth.users (id)
);
create trigger vendor_payout_accounts_set_updated_at
  before update on public.vendor_payout_accounts
  for each row execute function public.set_updated_at();

grant select, insert, update on public.vendor_payout_accounts to authenticated;
grant all on public.vendor_payout_accounts to service_role;
alter table public.vendor_payout_accounts enable row level security;

-- A vendor owner/manager manages their own account; platform admins manage all.
create policy vpa_select on public.vendor_payout_accounts for select to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  );
create policy vpa_write on public.vendor_payout_accounts for all to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  );

-- ------------------------------------------------------------------- payouts
create type public.payout_status as enum ('scheduled', 'processing', 'paid', 'failed', 'cancelled');

create table public.payouts (
  id                    uuid primary key default gen_random_uuid(),
  vendor_id             uuid not null references public.vendors (id) on delete restrict,
  amount_kobo           bigint not null check (amount_kobo > 0),
  currency              text not null default 'NGN',
  status                public.payout_status not null default 'scheduled',
  scheduled_for         timestamptz not null default now(),
  entry_count           int not null default 0,
  paystack_transfer_code text,
  paystack_reference    text unique,
  failure_reason        text,
  created_at            timestamptz not null default now(),
  processed_at          timestamptz
);
create index payouts_vendor_idx on public.payouts (vendor_id, created_at desc);
create index payouts_status_idx on public.payouts (status);

grant select on public.payouts to authenticated;
grant all on public.payouts to service_role;
alter table public.payouts enable row level security;

create policy payouts_select on public.payouts for select to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager','finance_officer']::public.vendor_role[])
  );

-- Which vendor_net ledger entries a payout settled.
alter table public.financial_ledger
  add column payout_id uuid references public.payouts (id) on delete set null;
create index financial_ledger_payout_idx on public.financial_ledger (payout_id);

-- --------------------------------------------------------- process_due_payouts
-- Sweep unsettled vendor_net (whose booking was paid at least p_hold_minutes
-- ago) into one scheduled payout per vendor that has a verified account.
-- Returns the payouts created. Admin/service-role only.
create or replace function public.process_due_payouts(p_hold_minutes int default 0)
returns table (payout_id uuid, vendor_id uuid, amount_kobo bigint, entry_count int)
language plpgsql security definer set search_path = public as $$
declare v record; p uuid;
begin
  if not (public.is_platform_admin() or auth.uid() is null) then
    raise exception 'not authorized to run payouts';
  end if;

  for v in
    select fl.vendor_id as vid, sum(fl.amount_kobo) as amt, count(*) as cnt
    from public.financial_ledger fl
    join public.bookings b on b.id = fl.booking_id
    join public.vendor_payout_accounts a on a.vendor_id = fl.vendor_id and a.is_verified
    where fl.entry_type = 'vendor_net'
      and fl.payout_id is null
      and b.status = 'paid'
      and b.updated_at <= now() - make_interval(mins => greatest(p_hold_minutes, 0))
    group by fl.vendor_id
    having sum(fl.amount_kobo) > 0
  loop
    insert into public.payouts (vendor_id, amount_kobo, entry_count, status)
      values (v.vid, v.amt::bigint, v.cnt::int, 'scheduled')
      returning id into p;
    update public.financial_ledger fl2
      set payout_id = p
      where fl2.entry_type = 'vendor_net' and fl2.payout_id is null and fl2.vendor_id = v.vid
        and fl2.booking_id in (select id from public.bookings where status = 'paid'
                           and updated_at <= now() - make_interval(mins => greatest(p_hold_minutes, 0)));
    return query select p, v.vid, v.amt::bigint, v.cnt::int;
  end loop;
end;
$$;
revoke all on function public.process_due_payouts(int) from public, anon;
grant execute on function public.process_due_payouts(int) to authenticated, service_role;

comment on table public.vendor_payout_accounts is 'Vendor bank account for Paystack settlement transfers.';
comment on table public.payouts is 'Settlement transfers to vendors; batches unsettled vendor_net ledger entries.';
