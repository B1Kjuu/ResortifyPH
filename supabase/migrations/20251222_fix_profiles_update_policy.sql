-- Migration: Fix duplicate and inefficient profiles update policy
-- Resolves lints:
-- - 0003_auth_rls_initplan (ensure (SELECT auth.uid()))
-- - 0006_multiple_permissive_policies (single UPDATE policy for authenticated)

begin;

-- Drop legacy/duplicate update policies by name if present
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Create a single canonical update policy using (SELECT auth.uid())
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

commit;