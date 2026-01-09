-- =====================================================
-- FIX PAYMENT RECEIPTS BUCKET
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Ensure bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-receipts', 
    'payment-receipts', 
    true,
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Authenticated users can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view related payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own payment receipts" ON storage.objects;

-- Step 3: Create upload policy
CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 4: Create view policy  
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

-- Step 5: Create delete policy
CREATE POLICY "Users can delete own payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verification queries
SELECT 'Bucket exists:' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payment-receipts') 
            THEN '✓ YES' 
            ELSE '✗ NO' 
       END as status;

SELECT 'Policies created:' as check_type,
       COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%payment%receipt%';
