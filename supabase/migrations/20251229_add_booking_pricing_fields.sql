-- Migration: Add advanced booking pricing fields to resorts and bookings tables
-- Date: 2024-12-29
-- Description: Supports Philippine resort booking patterns (daytour, overnight, 22hrs) with tiered pricing

-- Add pricing_config JSONB column to resorts table
-- This stores the advanced pricing configuration including:
-- - enabledTypes: which booking types are available
-- - enabledTimeSlots: which time slots are enabled for each type
-- - pricing: prices per booking type, day type, and guest tier
-- - guestTiers: custom guest count tiers
-- - downpaymentPercentage: required downpayment (default 50%)
ALTER TABLE public.resorts 
ADD COLUMN IF NOT EXISTS pricing_config jsonb DEFAULT NULL;

-- Add new booking fields to bookings table
-- booking_type: 'daytour' | 'overnight' | '22hrs'
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_type text DEFAULT NULL;

-- time_slot_id: references time slot from pricing config (e.g., 'overnight_7pm_6am', '22hrs_7pm_5pm')
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS time_slot_id text DEFAULT NULL;

-- check_in_time and check_out_time: actual times for the booking (e.g., '08:00', '17:00')
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS check_in_time text DEFAULT NULL;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS check_out_time text DEFAULT NULL;

-- total_price: calculated total price for the booking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT NULL;

-- downpayment_amount: required downpayment amount
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS downpayment_amount numeric DEFAULT NULL;

-- day_type: 'weekday' | 'weekend' for pricing purposes
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS day_type text DEFAULT NULL;

-- guest_tier_id: which guest tier was used for pricing
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_tier_id text DEFAULT NULL;

-- Add check constraint for booking_type
DO $$ BEGIN
  ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_booking_type_check 
  CHECK (booking_type IS NULL OR booking_type IN ('daytour', 'overnight', '22hrs'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add check constraint for day_type
DO $$ BEGIN
  ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_day_type_check 
  CHECK (day_type IS NULL OR day_type IN ('weekday', 'weekend'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index on booking_type for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON public.bookings(booking_type);

-- Comment on new columns
COMMENT ON COLUMN public.resorts.pricing_config IS 'Advanced pricing configuration JSON with enabled booking types, time slots, tiered pricing, and downpayment percentage';
COMMENT ON COLUMN public.bookings.booking_type IS 'Type of booking: daytour (8am-5pm), overnight (7pm-6am), or 22hrs (various slots)';
COMMENT ON COLUMN public.bookings.time_slot_id IS 'ID of the selected time slot for the booking';
COMMENT ON COLUMN public.bookings.check_in_time IS 'Actual check-in time for the booking (HH:mm format)';
COMMENT ON COLUMN public.bookings.check_out_time IS 'Actual check-out time for the booking (HH:mm format)';
COMMENT ON COLUMN public.bookings.total_price IS 'Calculated total price for the booking';
COMMENT ON COLUMN public.bookings.downpayment_amount IS 'Required downpayment amount based on resort configuration';
COMMENT ON COLUMN public.bookings.day_type IS 'Pricing day type: weekday or weekend/holiday';
COMMENT ON COLUMN public.bookings.guest_tier_id IS 'ID of the guest tier used for pricing calculation';
