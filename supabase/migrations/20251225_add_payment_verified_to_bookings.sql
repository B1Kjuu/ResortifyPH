-- Adds a timestamp column to note when owners verified payment offline
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz NULL;

-- Optional helper index
CREATE INDEX IF NOT EXISTS idx_bookings_payment_verified_at ON public.bookings(payment_verified_at);
