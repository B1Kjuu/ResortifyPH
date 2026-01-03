-- Add 'expired' status for bookings that were pending but past their start date
-- This allows automatic expiration of unconfirmed bookings

-- Drop the existing constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the updated constraint with 'expired' status
ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text, 'expired'::text]));

-- Add comment explaining the status values
COMMENT ON COLUMN public.bookings.status IS 'Booking status: pending (awaiting confirmation), confirmed (approved by owner), rejected (declined by owner), cancelled (cancelled by guest/owner), expired (pending booking past start date)';
