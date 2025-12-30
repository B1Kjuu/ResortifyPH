-- Fix booking overlap constraint to allow day-tours and overnight on same day
-- 
-- The exclusion constraint 'bookings_no_overlap' is too strict - it blocks all overlapping dates
-- regardless of booking_type. The create_booking_safe function already handles slot-aware
-- checking, but the constraint still fires when CONFIRMING a booking (status change to 'confirmed').
--
-- Solution: Drop the exclusion constraint entirely and rely on:
-- 1. create_booking_safe RPC for new booking creation (already slot-aware)
-- 2. A check trigger for when status changes to 'confirmed'

BEGIN;

-- Drop the overly-strict exclusion constraint
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Create a trigger function to check for overlaps on status change to 'confirmed'
CREATE OR REPLACE FUNCTION public.check_booking_overlap_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_is_single_day boolean;
  v_overlap boolean := false;
BEGIN
  -- Only check when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status <> 'confirmed') THEN
    v_is_single_day := (NEW.date_from = NEW.date_to);
    
    IF v_is_single_day AND NEW.booking_type IN ('daytour', 'overnight', 'day_12h', 'overnight_22h') THEN
      -- Single-day daytour or overnight: slot-aware check
      SELECT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.resort_id = NEW.resort_id
          AND b.id <> NEW.id
          AND b.status = 'confirmed'
          AND NOT (NEW.date_to < b.date_from OR NEW.date_from > b.date_to)
          AND (
            -- Conflicts with 22hrs (blocks whole day)
            b.booking_type = '22hrs'
            -- Conflicts with same booking type
            OR b.booking_type = NEW.booking_type
            -- Conflicts with legacy same type
            OR (b.booking_type = 'day_12h' AND NEW.booking_type = 'daytour')
            OR (b.booking_type = 'overnight_22h' AND NEW.booking_type = 'overnight')
            OR (b.booking_type = 'daytour' AND NEW.booking_type = 'day_12h')
            OR (b.booking_type = 'overnight' AND NEW.booking_type = 'overnight_22h')
            -- Conflicts with multi-day bookings
            OR (b.date_from <> b.date_to)
          )
      ) INTO v_overlap;
    ELSE
      -- Multi-day or 22hrs booking: traditional full overlap check
      SELECT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.resort_id = NEW.resort_id
          AND b.id <> NEW.id
          AND b.status = 'confirmed'
          AND NOT (NEW.date_to < b.date_from OR NEW.date_from > b.date_to)
      ) INTO v_overlap;
    END IF;

    IF v_overlap THEN
      RAISE EXCEPTION 'conflicting key value violates exclusion constraint "bookings_no_overlap"'
        USING HINT = 'Another booking already exists for this date and booking type';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON public.bookings;

-- Create trigger
CREATE TRIGGER check_booking_overlap_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_overlap_on_confirm();

COMMIT;
