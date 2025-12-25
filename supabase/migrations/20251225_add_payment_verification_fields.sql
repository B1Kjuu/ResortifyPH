-- Add offline payment verification metadata fields to bookings (no funds handled)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text NULL,
  ADD COLUMN IF NOT EXISTS payment_reference text NULL,
  ADD COLUMN IF NOT EXISTS verified_by uuid NULL,
  ADD COLUMN IF NOT EXISTS verified_notes text NULL;

-- Optional index to query verified_by quickly
CREATE INDEX IF NOT EXISTS idx_bookings_verified_by ON public.bookings(verified_by);