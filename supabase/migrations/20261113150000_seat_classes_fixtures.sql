-- ===========================================================================
-- Seat configuration upgrade (part 1): fixture/structure cell types on the
-- layout grid (from the supplied seat-reservation reference).
-- ===========================================================================
alter type public.seat_type add value if not exists 'wc';
alter type public.seat_type add value if not exists 'entrance';
alter type public.seat_type add value if not exists 'amenity';
alter type public.seat_type add value if not exists 'empty';
