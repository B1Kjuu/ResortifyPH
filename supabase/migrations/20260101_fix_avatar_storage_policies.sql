-- Fix avatars bucket storage policies
-- Add UPDATE and DELETE policies for authenticated users to manage their own avatars

BEGIN;

-- Enable UPDATE policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated update avatars'
  ) THEN
    CREATE POLICY "Authenticated update avatars"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END;
$$;

-- Enable DELETE policy for authenticated users to remove their own avatars  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated delete avatars'
  ) THEN
    CREATE POLICY "Authenticated delete avatars"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END;
$$;

-- Ensure upload policy allows users to upload to their own folder
DO $$
BEGIN
  -- Drop and recreate with folder restriction
  DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
  
  CREATE POLICY "Authenticated upload avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN OTHERS THEN
  -- Policy might not exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated upload avatars'
  ) THEN
    CREATE POLICY "Authenticated upload avatars"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END;
$$;

COMMIT;
