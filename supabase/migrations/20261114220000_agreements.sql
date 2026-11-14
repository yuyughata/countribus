-- ===========================================================================
-- Agreements — the Partner Agreement (operators) and the Boarding Policy
-- (customers). Admins edit clauses; each change publishes a new immutable
-- version. Operators e-sign the current Partner Agreement and the platform
-- counter-signs; customers accept the Boarding Policy + T&Cs at checkout.
--
--  * agreement_clauses — the editable working set (per kind), ordered, hideable.
--  * agreements        — published, versioned snapshots of the visible clauses.
--  * vendor_agreements — a vendor's signature + the platform counter-signature.
--  * bookings.terms_accepted_at / boarding_agreement_id — customer acceptance.
-- ===========================================================================

create table public.agreement_clauses (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('partner', 'boarding')),
  title      text not null,
  body       text not null default '',
  sort_order int not null default 0,
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agreement_clauses_kind_idx on public.agreement_clauses (kind, sort_order);
create trigger agreement_clauses_set_updated_at
  before update on public.agreement_clauses
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.agreement_clauses to authenticated;
grant all on public.agreement_clauses to service_role;
alter table public.agreement_clauses enable row level security;
create policy agreement_clauses_admin on public.agreement_clauses for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create table public.agreements (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('partner', 'boarding')),
  version      int not null,
  content      jsonb not null,  -- [{ "title": ..., "body": ... }], visible clauses in order
  content_hash text not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id),
  unique (kind, version)
);
create index agreements_kind_idx on public.agreements (kind, version desc);

-- Agreements (the terms themselves) are public — operators and customers read them.
grant select on public.agreements to anon, authenticated;
grant all on public.agreements to service_role;
alter table public.agreements enable row level security;
create policy agreements_select on public.agreements for select using (true);

create table public.vendor_agreements (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid not null references public.vendors (id) on delete cascade,
  agreement_id      uuid not null references public.agreements (id) on delete cascade,
  vendor_signature  text,          -- PNG data URL
  vendor_signer_name text,
  vendor_signed_at  timestamptz,
  admin_signature   text,          -- PNG data URL
  admin_signer_name text,
  admin_signed_at   timestamptz,
  admin_signed_by   uuid references auth.users (id),
  status            text not null default 'vendor_signed' check (status in ('vendor_signed', 'countersigned')),
  created_at        timestamptz not null default now(),
  unique (vendor_id, agreement_id)
);
create index vendor_agreements_vendor_idx on public.vendor_agreements (vendor_id);
create index vendor_agreements_status_idx on public.vendor_agreements (status);

grant select, insert, update on public.vendor_agreements to authenticated;
grant all on public.vendor_agreements to service_role;
alter table public.vendor_agreements enable row level security;
-- Vendor owner/manager manage their own signature; admins read all + counter-sign.
create policy vendor_agreements_select on public.vendor_agreements for select to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  );
create policy vendor_agreements_write on public.vendor_agreements for all to authenticated
  using (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  )
  with check (
    public.is_platform_admin()
    or public.has_vendor_role(vendor_id, array['vendor_owner','vendor_manager']::public.vendor_role[])
  );

-- Customer acceptance recorded on the booking.
alter table public.bookings
  add column terms_accepted_at timestamptz,
  add column boarding_agreement_id uuid references public.agreements (id) on delete set null;

-- ---------------------------------------------------------------------------
-- publish_agreement — snapshot the current VISIBLE clauses for a kind; if the
-- content differs from the latest version (by hash), publish a new version.
-- Returns the current (possibly new) version number. Admin-only.
-- ---------------------------------------------------------------------------
create or replace function public.publish_agreement(p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare v_content jsonb; v_hash text; v_last_hash text; v_next int;
begin
  if not public.is_platform_admin() then raise exception 'not authorized'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'body', body) order by sort_order), '[]'::jsonb)
    into v_content
    from public.agreement_clauses where kind = p_kind and not is_hidden;

  v_hash := md5(v_content::text);
  select content_hash, version into v_last_hash, v_next
    from public.agreements where kind = p_kind order by version desc limit 1;

  if v_last_hash is distinct from v_hash then
    v_next := coalesce(v_next, 0) + 1;
    insert into public.agreements (kind, version, content, content_hash, published_by)
      values (p_kind, v_next, v_content, v_hash, auth.uid());
  end if;
  return (select max(version) from public.agreements where kind = p_kind);
end;
$$;
revoke all on function public.publish_agreement(text) from public, anon;
grant execute on function public.publish_agreement(text) to authenticated, service_role;

comment on table public.agreements is 'Published, versioned Partner Agreement / Boarding Policy snapshots.';
comment on table public.vendor_agreements is 'Operator signature + platform counter-signature for a Partner Agreement version.';

-- ---------------------------------------------------------------------------
-- Seed default clauses + publish version 1 for each kind.
-- ---------------------------------------------------------------------------
insert into public.agreement_clauses (kind, title, body, sort_order) values
('partner', 'Non-circumvention',
 E'Customers introduced to you through Countribus are platform customers. For twelve (12) months from a customer''s first booking placed with you via Countribus, you agree to transact all intercity travel services for that customer through the Countribus platform.\n\nYou will not solicit, divert, or accept such customers'' bookings, payments, or contact outside the platform — directly or indirectly, and whether in cash or otherwise — during that period.\n\nBreach may result in withheld or reversed payouts, commission adjustments to recover lost platform fees, suspension, de-listing, and recovery of damages.', 1),
('partner', 'Service standards',
 E'Operate your published schedules reliably and board every passenger holding a valid Countribus ticket. Check passengers in and keep an accurate manifest for each departure.\n\nKeep your vehicles, seat layouts, routes, fares, terminal and boarding details up to date on Countribus, and maintain all licences, insurance and safety requirements for intercity operation.', 2),
('partner', 'Settlement & fees',
 E'Countribus deducts the agreed platform commission from each paid booking and settles your net earnings to your verified payout account automatically, within 24 hours, via our payment partner (Paystack).\n\nYou are responsible for keeping your payout bank account accurate and verified. Taxes applicable to your earnings are your responsibility.', 3);

insert into public.agreement_clauses (kind, title, body, sort_order) values
('boarding', 'Arrival & check-in',
 E'Arrive at the boarding terminal at least 30 minutes before departure. Present your Countribus ticket (on your phone or printed) and a valid means of identification to the operator''s staff.', 1),
('boarding', 'Luggage',
 E'Your first bag travels free. Extra, oversized or heavy luggage is charged per the operator''s luggage policy. Prohibited, dangerous or illegal items may not be carried and may be refused.', 2),
('boarding', 'Punctuality',
 E'Buses depart on schedule. Passengers who are not at the boarding point by the departure time may forfeit their seat without a refund. Please allow time for traffic and check-in.', 3),
('boarding', 'Children & infants',
 E'Children aged 6–10 travel at half fare and occupy a seat. Infants aged 1–5 travel free on a lap and do not occupy a seat. Please select the correct passenger type when booking.', 4),
('boarding', 'Conduct & safety',
 E'Follow the crew''s instructions at all times. Wear a seatbelt where fitted. Smoking, alcohol misuse and disruptive behaviour are not permitted and may result in removal without a refund.', 5),
('boarding', 'Changes & refunds',
 E'Cancellations, changes and refunds are handled according to the operator''s policy and the Countribus terms. Where a refund is due, it is returned to your original payment method.', 6);

do $$
declare k text; v_content jsonb;
begin
  foreach k in array array['partner','boarding'] loop
    select jsonb_agg(jsonb_build_object('title', title, 'body', body) order by sort_order)
      into v_content from public.agreement_clauses where kind = k and not is_hidden;
    insert into public.agreements (kind, version, content, content_hash)
      values (k, 1, v_content, md5(v_content::text));
  end loop;
end $$;
