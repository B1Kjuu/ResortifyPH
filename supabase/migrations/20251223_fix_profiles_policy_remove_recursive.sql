-- Fix: remove recursive policy causing 42P17 on profiles
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_owner_related'
  ) THEN
    DROP POLICY "profiles_select_owner_related" ON public.profiles;
  END IF;
END $$;

COMMIT;