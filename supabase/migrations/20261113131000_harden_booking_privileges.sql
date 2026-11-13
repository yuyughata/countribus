-- ===========================================================================
-- Phase 5 — Harden booking/payment privileges (addresses Supabase advisors).
-- ===========================================================================
-- Supabase auto-grants privileges to anon/authenticated on new objects, so a
-- plain `revoke ... from public` is not enough — revoke from the roles directly.

-- cancel_booking must never be callable by anonymous guests.
revoke all on function public.cancel_booking(uuid, text) from anon;

-- Server-only tables: no anon/authenticated access at all (RLS already denies
-- rows, but remove the stray grants for defence in depth).
revoke all on public.payment_transactions from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;
revoke all on public.ticket_delivery_events from anon, authenticated;
