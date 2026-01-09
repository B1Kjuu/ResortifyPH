-- Fix exclusion constraint to use exclusive end dates
-- This matches the booking logic: overnight 27-28 doesn't conflict with 28-29
-- because 27-28 occupies [27, 28) and 28-29 occupies [28, 29)

BEGIN;

-- Drop the old inclusive constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Add new constraint with exclusive upper bound '[)'
-- This means date_from is INCLUDED, date_to is EXCLUDED
-- So overnight 27-28 = [2026-01-27, 2026-01-28) doesn't overlap with 28-29 = [2026-01-28, 2026-01-29)
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    resort_id WITH =,
    daterange(date_from, date_to, '[)') WITH &&
  )
  WHERE (status = 'confirmed');

COMMIT;
