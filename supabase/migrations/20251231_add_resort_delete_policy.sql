-- Add DELETE policy for resorts table
-- Allows owners to delete their own resorts

BEGIN;

-- Check and create delete policy for resorts
DO $$
BEGIN
  -- Drop existing policy if it exists
  BEGIN
    DROP POLICY IF EXISTS "resorts_delete_owner" ON public.resorts;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Create policy allowing owners to delete their own resorts
  CREATE POLICY "resorts_delete_owner"
    ON public.resorts FOR DELETE TO authenticated
    USING (owner_id = (SELECT auth.uid()));
END $$;

COMMIT;
