-- Remove legacy exclusion constraint that blocks slot-aware bookings
-- This project uses trigger/RPC slot-aware overlap checks instead.

BEGIN;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;

COMMIT;
