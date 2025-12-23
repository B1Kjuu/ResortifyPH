-- Add cancellation workflow fields to bookings and allow 'cancelled' status
BEGIN;

-- Replace existing status check constraint to include 'cancelled'
DO $$
DECLARE ckname text;
BEGIN
  SELECT conname INTO ckname
  FROM pg_constraint
  WHERE conrelid = 'public.bookings'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%IN%';
  IF ckname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', ckname);
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','rejected','cancelled'));

-- Cancellation metadata
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_status text CHECK (cancellation_status IN ('requested','approved','rejected')),
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_approved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_status ON public.bookings(cancellation_status);

COMMIT;
