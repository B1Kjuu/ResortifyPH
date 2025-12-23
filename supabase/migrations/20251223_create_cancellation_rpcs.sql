-- RPCs for booking cancellation request and owner response; update owner bookings RPC to include cancellation fields
BEGIN;

-- Guest requests cancellation for a confirmed booking
CREATE OR REPLACE FUNCTION public.request_booking_cancellation(p_booking_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure guest owns booking, booking is confirmed, and no existing request
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id
      AND b.guest_id = (SELECT auth.uid())
      AND b.status = 'confirmed'
      AND b.cancellation_status IS NULL
  ) THEN
    RAISE EXCEPTION 'Not permitted or invalid booking';
  END IF;

  UPDATE public.bookings
  SET cancellation_status = 'requested',
      cancellation_requested_at = now(),
      cancellation_reason = NULLIF(p_reason, '')
  WHERE id = p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_booking_cancellation(uuid, text) TO authenticated;

-- Owner responds to a cancellation request
CREATE OR REPLACE FUNCTION public.respond_booking_cancellation(p_booking_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure current user owns the resort of this booking and request is pending
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.resorts r ON r.id = b.resort_id
    WHERE b.id = p_booking_id
      AND r.owner_id = (SELECT auth.uid())
      AND b.cancellation_status = 'requested'
  ) THEN
    RAISE EXCEPTION 'Not permitted or invalid cancellation request';
  END IF;

  IF p_approve THEN
    UPDATE public.bookings
    SET cancellation_status = 'approved',
        cancellation_approved_at = now(),
        status = 'cancelled'
    WHERE id = p_booking_id;
  ELSE
    UPDATE public.bookings
    SET cancellation_status = 'rejected',
        cancellation_approved_at = now()
    WHERE id = p_booking_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_booking_cancellation(uuid, boolean) TO authenticated;

-- Update owner bookings RPC to include cancellation fields
-- Drop old version to allow changing return type
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
  status text,
  cancellation_status text,
  cancellation_requested_at timestamptz,
  cancellation_reason text,
  created_at timestamptz
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
    b.status,
    b.cancellation_status,
    b.cancellation_requested_at,
    b.cancellation_reason,
    b.created_at
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

-- Drop old admin RPC and recreate to include cancellation fields
DROP FUNCTION IF EXISTS public.get_all_bookings();

CREATE OR REPLACE FUNCTION public.get_all_bookings()
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
  status text,
  cancellation_status text,
  cancellation_requested_at timestamptz,
  cancellation_reason text,
  created_at timestamptz
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
    b.status,
    b.cancellation_status,
    b.cancellation_requested_at,
    b.cancellation_reason,
    b.created_at
  FROM public.bookings b
  JOIN public.resorts r ON r.id = b.resort_id
  JOIN public.profiles p ON p.id = b.guest_id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = (SELECT auth.uid()) AND me.is_admin = TRUE
  )
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_all_bookings() TO authenticated;

COMMIT;
