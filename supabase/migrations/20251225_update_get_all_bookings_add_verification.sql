-- Drop and recreate get_all_bookings() to include payment verification columns
BEGIN;

DROP FUNCTION IF EXISTS public.get_all_bookings();

CREATE FUNCTION public.get_all_bookings()
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
  created_at timestamptz,
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
    b.status,
    b.cancellation_status,
    b.cancellation_requested_at,
    b.cancellation_reason,
    b.created_at,
    b.payment_verified_at,
    b.payment_method,
    b.payment_reference,
    b.verified_by,
    b.verified_notes
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
