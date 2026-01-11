-- Allow owners to insert "external/manual" bookings without attaching to themselves,
-- and update owner bookings RPC to tolerate NULL guest_id.

BEGIN;

-- 1) Relax INSERT policy: allow owner inserts for their own resorts (guest inserts still allowed)
DROP POLICY IF EXISTS "bookings_insert_guest" ON public.bookings;
CREATE POLICY "bookings_insert_guest"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    guest_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.resorts r
      WHERE r.id = public.bookings.resort_id AND r.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true
    )
  );

-- 2) Update get_owner_bookings() to LEFT JOIN guest profile (supports NULL guest_id)
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
  LEFT JOIN public.profiles p ON p.id = b.guest_id
  WHERE r.owner_id = (SELECT auth.uid())
     OR EXISTS (
       SELECT 1 FROM public.profiles me
       WHERE me.id = (SELECT auth.uid()) AND me.is_admin = TRUE
     )
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_owner_bookings() TO authenticated;

COMMIT;
