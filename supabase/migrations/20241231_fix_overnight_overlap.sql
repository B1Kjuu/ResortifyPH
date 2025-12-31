-- Migration: Fix overnight booking overlap - overnight spans 2 days but is still a slot booking
-- Date: 2024-12-31
-- Description: Treat overnight bookings that span 2 consecutive days as slot bookings, not multi-day

-- Drop ALL existing versions of the function
DO $$
DECLARE
  func_oid oid;
BEGIN
  FOR func_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_booking_safe'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_oid::regprocedure);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_booking_safe(
  p_resort_id uuid,
  p_guest_id uuid,
  p_date_from date,
  p_date_to date,
  p_guest_count int,
  p_resort_province text DEFAULT NULL,
  p_resort_region_code text DEFAULT NULL,
  p_resort_region_name text DEFAULT NULL,
  p_stay_type text DEFAULT NULL,
  p_children_count int DEFAULT 0,
  p_pets_count int DEFAULT 0,
  p_booking_type text DEFAULT NULL,
  p_time_slot_id text DEFAULT NULL,
  p_check_in_time text DEFAULT NULL,
  p_check_out_time text DEFAULT NULL,
  p_total_price numeric DEFAULT NULL,
  p_downpayment_amount numeric DEFAULT NULL,
  p_day_type text DEFAULT NULL,
  p_guest_tier_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_now date := now()::date;
  v_auth uuid := auth.uid();
  v_overlap boolean := false;
  v_pending_exists boolean := false;
  v_is_single_day boolean := (p_date_from = p_date_to);
  v_is_overnight_span boolean := false;
  v_is_slot_booking boolean := false;
BEGIN
  -- Basic validation
  IF p_resort_id IS NULL OR p_guest_id IS NULL THEN
    RAISE EXCEPTION 'Missing resort_id or guest_id';
  END IF;
  IF p_date_from IS NULL OR p_date_to IS NULL THEN
    RAISE EXCEPTION 'Missing dates';
  END IF;
  IF p_date_from > p_date_to THEN
    RAISE EXCEPTION 'date_from must be <= date_to';
  END IF;

  -- Ensure caller matches guest
  IF v_auth IS NULL OR v_auth <> p_guest_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Prevent owners from booking their own resort
  IF EXISTS (
    SELECT 1 FROM public.resorts r
    WHERE r.id = p_resort_id AND r.owner_id = p_guest_id
  ) THEN
    RAISE EXCEPTION 'self_booking_not_allowed';
  END IF;

  -- Determine if this is an overnight booking spanning exactly 2 consecutive days
  -- Overnight: check-in day evening → checkout day morning (spans 2 days but is a slot booking)
  v_is_overnight_span := (
    p_booking_type IN ('overnight', 'overnight_22h') 
    AND p_date_to = p_date_from + INTERVAL '1 day'
  );
  
  -- Slot bookings: daytour (single day), overnight (1-2 days), or explicit slot types
  v_is_slot_booking := (
    v_is_single_day AND p_booking_type IN ('daytour', 'day_12h')
  ) OR (
    v_is_overnight_span
  );

  IF v_is_slot_booking THEN
    -- Slot-aware overlap check
    IF p_booking_type IN ('daytour', 'day_12h') THEN
      -- Daytour: conflicts with same-day daytour, 22hrs, or multi-day bookings
      SELECT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.resort_id = p_resort_id
          AND b.status = 'confirmed'
          AND b.date_from <= p_date_to AND b.date_to >= p_date_from
          AND (
            b.booking_type = '22hrs'
            OR b.booking_type IN ('daytour', 'day_12h')
            -- True multi-day bookings (not overnight spans)
            OR (b.date_to > b.date_from + INTERVAL '1 day')
            OR (b.date_to = b.date_from + INTERVAL '1 day' AND b.booking_type NOT IN ('overnight', 'overnight_22h'))
          )
      ) INTO v_overlap;
    ELSE
      -- Overnight: conflicts with same-day overnight, 22hrs, or true multi-day bookings
      -- Overnight uses check-in date's evening and checkout date's morning
      SELECT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.resort_id = p_resort_id
          AND b.status = 'confirmed'
          AND (
            -- Check-in date conflicts (evening slot)
            (b.date_from = p_date_from AND b.booking_type IN ('overnight', 'overnight_22h', '22hrs'))
            OR (b.date_from = p_date_from AND b.date_to > b.date_from + INTERVAL '1 day')
            OR (b.date_from = p_date_from AND b.date_to = b.date_from + INTERVAL '1 day' AND b.booking_type NOT IN ('overnight', 'overnight_22h'))
            -- Checkout date conflicts (morning slot used by overnight)
            OR (b.date_to = p_date_to AND b.booking_type IN ('overnight', 'overnight_22h', '22hrs'))
            -- Overlapping multi-day bookings that span our dates
            OR (b.date_from < p_date_from AND b.date_to > p_date_to)
            -- 22hrs on either day blocks everything
            OR (b.booking_type = '22hrs' AND b.date_from <= p_date_to AND b.date_to >= p_date_from)
          )
      ) INTO v_overlap;
    END IF;
  ELSIF p_booking_type = '22hrs' THEN
    -- 22hrs blocks the entire day, conflicts with any booking on that day
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.resort_id = p_resort_id
        AND b.status = 'confirmed'
        AND b.date_from <= p_date_to AND b.date_to >= p_date_from
    ) INTO v_overlap;
  ELSE
    -- True multi-day booking: conflicts with ANY overlapping booking
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.resort_id = p_resort_id
        AND b.status = 'confirmed'
        AND b.date_from <= p_date_to AND b.date_to >= p_date_from
    ) INTO v_overlap;
  END IF;

  IF v_overlap THEN
    RAISE EXCEPTION 'overlap';
  END IF;

  -- Prevent multiple pending bookings by the same guest for the same resort
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.resort_id = p_resort_id
      AND b.guest_id = p_guest_id
      AND b.status = 'pending'
  ) INTO v_pending_exists;

  IF v_pending_exists THEN
    RAISE EXCEPTION 'duplicate_pending';
  END IF;

  -- Insert pending booking with all fields
  INSERT INTO public.bookings (
    resort_id,
    guest_id,
    date_from,
    date_to,
    guest_count,
    children_count,
    pets_count,
    booking_type,
    time_slot_id,
    check_in_time,
    check_out_time,
    total_price,
    downpayment_amount,
    day_type,
    guest_tier_id,
    status
  )
  VALUES (
    p_resort_id,
    p_guest_id,
    p_date_from,
    p_date_to,
    GREATEST(p_guest_count, 1),
    COALESCE(p_children_count, 0),
    COALESCE(p_pets_count, 0),
    p_booking_type,
    p_time_slot_id,
    p_check_in_time,
    p_check_out_time,
    p_total_price,
    p_downpayment_amount,
    p_day_type,
    p_guest_tier_id,
    'pending'
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_booking_safe TO authenticated;

-- Also update the trigger function
CREATE OR REPLACE FUNCTION public.check_booking_overlap_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_is_overnight_span boolean;
  v_is_slot_booking boolean;
  v_conflict_count integer := 0;
BEGIN
  -- Only check when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    
    -- Determine if overnight spanning 2 days
    v_is_overnight_span := (
      NEW.booking_type IN ('overnight', 'overnight_22h') 
      AND NEW.date_to = NEW.date_from + INTERVAL '1 day'
    );
    
    v_is_slot_booking := (
      NEW.date_from = NEW.date_to AND NEW.booking_type IN ('daytour', 'day_12h')
    ) OR v_is_overnight_span;

    IF v_is_slot_booking AND NEW.booking_type IN ('daytour', 'day_12h') THEN
      -- Daytour slot check
      SELECT COUNT(*) INTO v_conflict_count
      FROM public.bookings b
      WHERE b.resort_id = NEW.resort_id
        AND b.id <> NEW.id
        AND b.status = 'confirmed'
        AND b.date_from <= NEW.date_to AND b.date_to >= NEW.date_from
        AND (
          b.booking_type = '22hrs'
          OR b.booking_type IN ('daytour', 'day_12h')
          OR (b.date_to > b.date_from + INTERVAL '1 day')
        );
    ELSIF v_is_slot_booking AND NEW.booking_type IN ('overnight', 'overnight_22h') THEN
      -- Overnight slot check
      SELECT COUNT(*) INTO v_conflict_count
      FROM public.bookings b
      WHERE b.resort_id = NEW.resort_id
        AND b.id <> NEW.id
        AND b.status = 'confirmed'
        AND (
          (b.date_from = NEW.date_from AND b.booking_type IN ('overnight', 'overnight_22h', '22hrs'))
          OR (b.date_to = NEW.date_to AND b.booking_type IN ('overnight', 'overnight_22h', '22hrs'))
          OR (b.date_from < NEW.date_from AND b.date_to > NEW.date_to)
          OR (b.booking_type = '22hrs' AND b.date_from <= NEW.date_to AND b.date_to >= NEW.date_from)
        );
    ELSE
      -- Multi-day or 22hrs: full overlap check
      SELECT COUNT(*) INTO v_conflict_count
      FROM public.bookings b
      WHERE b.resort_id = NEW.resort_id
        AND b.id <> NEW.id
        AND b.status = 'confirmed'
        AND b.date_from <= NEW.date_to AND b.date_to >= NEW.date_from;
    END IF;

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Booking conflict: Another confirmed booking exists for these dates';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers exist
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
