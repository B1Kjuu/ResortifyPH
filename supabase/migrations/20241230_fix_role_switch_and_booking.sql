-- Fix role switching and booking overlap issues
-- Run this in Supabase SQL Editor

-- 1. FIX ROLE SWITCHING: Ensure update policy exists
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 2. FIX BOOKING OVERLAP: Drop the exclusion constraint
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- 3. Create slot-aware overlap checking function
CREATE OR REPLACE FUNCTION public.check_booking_overlap_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_is_single_day boolean;
  v_conflict_count integer := 0;
BEGIN
  -- Only check when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    v_is_single_day := (NEW.date_from = NEW.date_to);
    
    IF v_is_single_day AND NEW.booking_type IN ('daytour', 'overnight', 'day_12h', 'overnight_22h') THEN
      -- Single-day slot booking: only conflicts with same slot type or blocking types
      SELECT COUNT(*) INTO v_conflict_count
      FROM public.bookings b
      WHERE b.resort_id = NEW.resort_id
        AND b.id <> NEW.id
        AND b.status = 'confirmed'
        AND b.date_from <= NEW.date_to 
        AND b.date_to >= NEW.date_from
        AND (
          -- 22hrs blocks everything
          b.booking_type = '22hrs'
          -- Same slot type conflicts (daytour vs daytour, overnight vs overnight)
          OR (NEW.booking_type IN ('daytour', 'day_12h') AND b.booking_type IN ('daytour', 'day_12h'))
          OR (NEW.booking_type IN ('overnight', 'overnight_22h') AND b.booking_type IN ('overnight', 'overnight_22h'))
          -- Multi-day bookings block everything
          OR (b.date_from <> b.date_to)
        );
    ELSE
      -- Multi-day or 22hrs booking: conflicts with ANY overlap
      SELECT COUNT(*) INTO v_conflict_count
      FROM public.bookings b
      WHERE b.resort_id = NEW.resort_id
        AND b.id <> NEW.id
        AND b.status = 'confirmed'
        AND b.date_from <= NEW.date_to 
        AND b.date_to >= NEW.date_from;
    END IF;

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Booking conflict: Another confirmed booking exists for these dates';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Drop and recreate triggers
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON public.bookings;
DROP TRIGGER IF EXISTS check_booking_overlap_insert_trigger ON public.bookings;

CREATE TRIGGER check_booking_overlap_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_overlap_on_confirm();

CREATE TRIGGER check_booking_overlap_insert_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_overlap_on_confirm();
