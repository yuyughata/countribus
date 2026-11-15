-- ===========================================================================
-- Support tickets + vendor reviews.
--  * Customers raise feedback / complaints / assistance (optionally about a
--    booking). Operators raise technical / platform / billing issues to admin.
--  * Admin sees every ticket and replies; threads hold the conversation.
--  * Customers rate the operator after a paid trip; a vendor with a poor
--    rating or many complaints is flagged to admin (vendor_health()).
-- ===========================================================================

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references auth.users (id) on delete set null,
  author_kind text not null check (author_kind in ('customer', 'operator')),
  category    text not null,
  vendor_id   uuid references public.vendors (id) on delete set null,
  booking_id  uuid references public.bookings (id) on delete set null,
  subject     text not null,
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index support_tickets_creator_idx on public.support_tickets (created_by, created_at desc);
create index support_tickets_complaint_idx on public.support_tickets (vendor_id)
  where category = 'complaint';
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets (id) on delete cascade,
  author_id  uuid references auth.users (id) on delete set null,
  is_admin   boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
grant all on public.support_tickets, public.support_messages to service_role;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Creator sees their own; platform admin sees all.
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (created_by = auth.uid() or public.is_platform_admin());
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (created_by = auth.uid());
-- Only admins change a ticket (status).
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy support_messages_select on public.support_messages for select to authenticated
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and (t.created_by = auth.uid() or public.is_platform_admin())
  ));
-- You may post on a ticket you can see; the admin flag must match your status.
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_admin = public.is_platform_admin()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and (t.created_by = auth.uid() or public.is_platform_admin())
    )
  );

-- Vendor reviews -----------------------------------------------------------
create table public.vendor_reviews (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references public.vendors (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);
create index vendor_reviews_vendor_idx on public.vendor_reviews (vendor_id);

grant select on public.vendor_reviews to anon, authenticated;
grant insert on public.vendor_reviews to authenticated;
grant all on public.vendor_reviews to service_role;

alter table public.vendor_reviews enable row level security;
-- Reviews are public (marketplace rating); a passenger reviews their own paid
-- booking's operator, once.
create policy vendor_reviews_select on public.vendor_reviews for select using (true);
create policy vendor_reviews_insert on public.vendor_reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.created_by = auth.uid()
        and b.vendor_id = vendor_reviews.vendor_id and b.status = 'paid'
    )
  );

-- Admin health view: rating + complaints per operator, with a flag.
create or replace function public.vendor_health()
returns table (
  vendor_id uuid, vendor_name text, avg_rating numeric, review_count int,
  complaint_count int, open_complaints int, flagged boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not authorized'; end if;
  return query
    select v.id, v.name,
      round(coalesce(avg(r.rating), 0)::numeric, 2) as avg_rating,
      count(r.id)::int as review_count,
      (select count(*) from public.support_tickets t where t.vendor_id = v.id and t.category = 'complaint')::int,
      (select count(*) from public.support_tickets t where t.vendor_id = v.id and t.category = 'complaint' and t.status in ('open', 'in_progress'))::int,
      (
        (count(r.id) >= 3 and avg(r.rating) < 3.0)
        or (select count(*) from public.support_tickets t where t.vendor_id = v.id and t.category = 'complaint') >= 3
      ) as flagged
    from public.vendors v
    left join public.vendor_reviews r on r.vendor_id = v.id
    where v.status = 'approved'
    group by v.id, v.name;
end;
$$;
revoke all on function public.vendor_health() from public, anon;
grant execute on function public.vendor_health() to authenticated, service_role;

notify pgrst, 'reload schema';
