-- ===========================================================================
-- Walk-in bookings pay via the normal payment link (card or bank transfer),
-- confirmed by the verified provider webhook — same as online.
-- ===========================================================================
-- Supersedes the counter cash/POS model from 20261116120000: a counter sale no
-- longer sets `paid` directly. Instead the staff member creates a PENDING
-- booking (attributed to them via channel='walk_in' + sold_by); payment is then
-- completed through the existing payment button / Paystack checkout (which
-- offers card AND bank-transfer account details) and the booking becomes paid
-- only from the verified webhook (`confirm_payment`). This restores the
-- "paid only from a verified provider webhook" invariant for every channel.
--
-- The passenger receives the payment link by email; the booking staff can also
-- open it to read the bank-transfer account details. Commission ledger +
-- electronic tickets are produced by `confirm_payment` on the webhook, exactly
-- like an online booking — so no counter-specific payment record is needed.

-- Remove the counter cash payment model (unreleased; the table is empty).
drop function if exists public.create_walkin_booking(uuid, jsonb, jsonb, jsonb, public.counter_method, text);
drop table if exists public.counter_payments;
drop type if exists public.counter_method;

-- Create a PENDING walk-in booking attributed to the acting staff member.
-- Reuses the online hold + booking pipeline (server-side fares, infants, seat
-- concurrency) and stamps channel/sold_by. SECURITY DEFINER so it can set the
-- attribution columns (there is no authenticated UPDATE policy on bookings) and
-- so the authorization gate below is the single source of truth.
create or replace function public.create_walkin_booking(
  p_schedule uuid,
  p_contact jsonb,
  p_passengers jsonb,
  p_infants jsonb default '[]'::jsonb
) returns table (booking_id uuid, reference text, amount_kobo bigint)
language plpgsql security definer set search_path = public as $function$
declare
  v_uid uuid := auth.uid();
  v_vendor uuid; seat_ids text[]; tok text; bk uuid; ref text; total bigint;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select vendor_id into v_vendor
    from public.schedules where id = p_schedule and status = 'published';
  if v_vendor is null then raise exception 'schedule is not open for booking'; end if;

  if not (public.is_platform_admin()
          or public.has_vendor_role(v_vendor,
               array['vendor_owner','vendor_manager','booking_officer']::public.vendor_role[])) then
    raise exception 'not authorized to record a walk-in booking for this operator';
  end if;

  select array_agg(x->>'seat_id') into seat_ids
    from jsonb_array_elements(coalesce(p_passengers, '[]'::jsonb)) x;
  if seat_ids is null or array_length(seat_ids, 1) = 0 then
    raise exception 'no seated passengers supplied';
  end if;

  -- Hold the seats, then create the pending booking through the shared pipeline.
  tok := 'WI-' || replace(gen_random_uuid()::text, '-', '');
  perform public.hold_seats(p_schedule, seat_ids, tok, 30);
  select cb.booking_id, cb.reference
    into bk, ref
    from public.create_booking_from_hold(p_schedule, tok, p_contact, p_passengers, p_infants) cb;

  update public.bookings set channel = 'walk_in', sold_by = v_uid where id = bk;

  select grand_total_kobo into total from public.bookings where id = bk;
  return query select bk, ref, total;
end;
$function$;
revoke all on function public.create_walkin_booking(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_walkin_booking(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
