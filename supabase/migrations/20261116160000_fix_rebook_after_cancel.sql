-- ===========================================================================
-- Fix: a seat could never be rebooked after its booking was cancelled/expired.
-- ===========================================================================
-- booking_passengers had unique(schedule_id, seat_id), but cancelling/expiring a
-- booking frees the seat in schedule_seats WITHOUT removing the historical
-- booking_passengers row. The next booking of that seat then violated the
-- constraint — so any cancelled/expired seat became permanently unbookable
-- (online and walk-in alike).
--
-- That constraint was redundant: live seat allocation is enforced by the
-- schedule_seats partial unique index (unique on (schedule_id, seat_id) WHERE
-- state in ('booked','held')) plus the atomic available->held/booked UPDATE with
-- row locks. booking_passengers is an append-only record (including rows for
-- cancelled bookings), so uniqueness on (schedule_id, seat_id) there is wrong.
-- Drop it; the schedule_seats index remains the single source of truth for
-- "a seat is taken".

alter table public.booking_passengers
  drop constraint if exists booking_passengers_schedule_id_seat_id_key;

notify pgrst, 'reload schema';
