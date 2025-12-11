-- Ensure all profiles have a valid role
-- This migration makes role switching work for existing users

-- Set default role for any NULL or empty roles
UPDATE profiles 
SET role = 'guest' 
WHERE role IS NULL OR role = '';

-- Optional: Add a default value for future inserts
-- (This is already in your schema, but just to be safe)
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'guest';

-- Verify the change
SELECT id, full_name, role, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
