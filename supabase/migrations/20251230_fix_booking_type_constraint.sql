-- Migration: Fix booking_type constraint to include all valid values
-- Drop the old constraint and create a new one with all allowed values

-- Drop existing constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

-- Re-add with expanded values including legacy stayType values
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_booking_type_check 
CHECK (
  booking_type IS NULL 
  OR booking_type IN (
    'daytour',      -- New booking type
    'overnight',    -- New booking type  
    '22hrs',        -- New booking type
    'day_12h',      -- Legacy stayType value
    'overnight_22h' -- Legacy stayType value
  )
);

COMMENT ON COLUMN public.bookings.booking_type IS 'Type of booking: daytour, overnight, 22hrs (new) or day_12h, overnight_22h (legacy)';
