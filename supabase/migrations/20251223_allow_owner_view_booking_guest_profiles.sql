-- Allow resort owners to view profiles of guests who booked their resorts
BEGIN;

-- Ensure RLS is enabled on profiles (already enabled in previous migrations)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: owners can SELECT guest profiles related to their resorts' bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_owner_related'
  ) THEN
    CREATE POLICY "profiles_select_owner_related"
      ON public.profiles FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.bookings b
          JOIN public.resorts r ON r.id = b.resort_id
          WHERE b.guest_id = public.profiles.id
            AND r.owner_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true
        )
      );
  END IF;
END $$;

COMMIT;
