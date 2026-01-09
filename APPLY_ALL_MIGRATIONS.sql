-- ========================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Applies all pending migrations at once
-- ========================================

-- MIGRATION 1: Fix Exclusion Constraint (FIXES BOOKING CONFIRMATION ERROR)
-- This fixes: "Booking conflict: Another confirmed booking exists for these dates"
BEGIN;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    resort_id WITH =,
    daterange(date_from, date_to, '[)') WITH &&
  )
  WHERE (status = 'confirmed');

COMMIT;

-- ========================================
-- MIGRATION 2: Create Review Images Bucket
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-images'
  AND (storage.foldername(name))[1] = 'reviews'
);

CREATE POLICY "Anyone can view review images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-images');

CREATE POLICY "Users can delete their own review images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- ========================================
-- MIGRATION 3: Create Payment Receipts Bucket
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view related payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 
      FROM payment_submissions ps
      JOIN bookings b ON ps.booking_id = b.id
      JOIN resorts r ON b.resort_id = r.id
      WHERE ps.receipt_url LIKE '%' || name || '%'
      AND r.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ========================================
-- MIGRATION 4: Update get_owner_bookings() RPC (FIXES BOOKING TYPE DISPLAY)
-- ========================================

DROP FUNCTION IF EXISTS public.get_owner_bookings();

CREATE OR REPLACE FUNCTION public.get_owner_bookings()
RETURNS TABLE (
  booking_id uuid,
  resort_id uuid,
  resort_name text,
  guest_id uuid,
  guest_full_name text,
  guest_email text,
  date_from date,
  date_to date,
  guest_count int,
  children_count int,
  pets_count int,
  booking_type text,
  status text,
  created_at timestamptz,
  cancellation_status text,
  cancellation_requested_at timestamptz,
  cancellation_reason text,
  payment_verified_at timestamptz,
  payment_method text,
  payment_reference text,
  verified_by uuid,
  verified_notes text
) AS $$
  SELECT
    b.id AS booking_id,
    b.resort_id,
    r.name AS resort_name,
    b.guest_id,
    p.full_name AS guest_full_name,
    p.email AS guest_email,
    b.date_from,
    b.date_to,
    b.guest_count,
    b.children_count,
    b.pets_count,
    b.booking_type,
    b.status,
    b.created_at,
    b.cancellation_status,
    b.cancellation_requested_at,
    b.cancellation_reason,
    b.payment_verified_at,
    b.payment_method,
    b.payment_reference,
    b.verified_by,
    b.verified_notes
  FROM public.bookings b
  JOIN public.resorts r ON r.id = b.resort_id
  JOIN public.profiles p ON p.id = b.guest_id
  WHERE r.owner_id = (SELECT auth.uid())
     OR EXISTS (
       SELECT 1 FROM public.profiles me
       WHERE me.id = (SELECT auth.uid()) AND me.is_admin = TRUE
     )
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_owner_bookings() TO authenticated;

-- ========================================
-- MIGRATION 5: Fix Booking Overlap Logic (FIXES CONSECUTIVE OVERNIGHTS)
-- ========================================

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
  v_guest_has_overlapping_booking boolean := false;
  v_is_single_day boolean := (p_date_from = p_date_to);
BEGIN
  IF p_resort_id IS NULL OR p_guest_id IS NULL THEN
    RAISE EXCEPTION 'Missing resort_id or guest_id';
  END IF;
  IF p_date_from IS NULL OR p_date_to IS NULL THEN
    RAISE EXCEPTION 'Missing dates';
  END IF;
  IF p_date_from > p_date_to THEN
    RAISE EXCEPTION 'date_from must be <= date_to';
  END IF;

  IF v_auth IS NULL OR v_auth <> p_guest_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.resorts r
    WHERE r.id = p_resort_id AND r.owner_id = p_guest_id
  ) THEN
    RAISE EXCEPTION 'self_booking_not_allowed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.guest_id = p_guest_id
      AND b.status IN ('pending', 'confirmed')
      AND p_date_from < b.date_to
      AND p_date_to > b.date_from
  ) INTO v_guest_has_overlapping_booking;

  IF v_guest_has_overlapping_booking THEN
    RAISE EXCEPTION 'guest_already_has_booking_on_these_dates';
  END IF;

  IF v_is_single_day AND p_booking_type IN ('daytour', 'overnight') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.resort_id = p_resort_id
        AND b.status = 'confirmed'
        AND p_date_from < b.date_to
        AND p_date_to > b.date_from
        AND (
          b.booking_type = '22hrs'
          OR b.booking_type = p_booking_type
          OR (b.booking_type = 'day_12h' AND p_booking_type = 'daytour')
          OR (b.booking_type = 'overnight_22h' AND p_booking_type = 'overnight')
          OR (b.date_from <> b.date_to)
        )
    ) INTO v_overlap;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.resort_id = p_resort_id
        AND b.status = 'confirmed'
        AND p_date_from < b.date_to
        AND p_date_to > b.date_from
    ) INTO v_overlap;
  END IF;

  IF v_overlap THEN
    RAISE EXCEPTION 'overlap';
  END IF;

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
    p_guest_count,
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

GRANT EXECUTE ON FUNCTION public.create_booking_safe TO authenticated;

-- ========================================
-- SUCCESS! All migrations applied ✅
-- Now test:
-- ✅ Booking confirmation (overnight 11-12 when 22hrs on 12)
-- ✅ Consecutive overnights (27-28 then 28-29)
-- ✅ Review image uploads
-- ✅ Payment receipt uploads
-- ✅ Booking type badges in owner/bookings
-- ========================================
