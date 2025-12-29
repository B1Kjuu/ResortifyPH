-- Add children_count and pets_count to bookings
BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS children_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pets_count integer NOT NULL DEFAULT 0;

-- Ensure non-negative values
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_children_count_nonneg CHECK (children_count >= 0),
  ADD CONSTRAINT bookings_pets_count_nonneg CHECK (pets_count >= 0);

COMMIT;
