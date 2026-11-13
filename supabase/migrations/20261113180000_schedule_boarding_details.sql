-- ===========================================================================
-- Boarding details captured when a bus/departure is added for bookings.
--
-- Each schedule (a bus made available for booking) carries the boarding point's
-- street address and a passenger contact number. These print on the ticket and
-- are sent in the SMS/WhatsApp confirmation. Nullable at the DB level so prior
-- rows and the publish flow are unaffected; the dashboard form requires them
-- going forward.
-- ===========================================================================

alter table public.schedules
  add column if not exists boarding_address      text,
  add column if not exists boarding_contact_phone text;

comment on column public.schedules.boarding_address is
  'Street address of the boarding terminal/station, entered when the bus is added for bookings. Shown on tickets and in confirmations.';
comment on column public.schedules.boarding_contact_phone is
  'Passenger contact number for this departure, shown on tickets and in confirmations.';
