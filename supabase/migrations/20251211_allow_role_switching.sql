-- Allow users to switch between guest and owner roles
-- This migration enables role-switching functionality like Airbnb

-- The 'role' column remains as is (guest or owner)
-- We don't need to add can_be_owner if we allow role updates via app logic

-- Users can now:
-- 1. Start as 'guest' on signup
-- 2. Switch to 'owner' role anytime
-- 3. Switch back to 'guest' role anytime
-- 4. This is handled by the app updating the role column in profiles table

-- IMPORTANT: Run this in Supabase SQL Editor
-- No schema changes needed - role switching is handled at app level

-- Optional: You could track when someone became an owner
-- ALTER TABLE profiles ADD COLUMN became_owner_at TIMESTAMP;

-- Optional: You could track if they've hosted before
-- ALTER TABLE profiles ADD COLUMN has_hosted BOOLEAN DEFAULT FALSE;
