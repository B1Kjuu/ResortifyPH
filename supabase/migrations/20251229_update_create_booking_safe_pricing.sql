-- Migration: Update create_booking_safe RPC to support new booking pricing fields
-- Date: 2024-12-29
-- Description: Adds parameters for booking type, time slot, and pricing information

-- Drop ALL existing versions of the function using pg_proc lookup
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
  -- New booking pricing fields
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

  -- Prevent overlap with confirmed bookings for this resort
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.resort_id = p_resort_id
      AND b.status = 'confirmed'
      AND NOT (p_date_to < b.date_from OR p_date_from > b.date_to)
  ) INTO v_overlap;

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
