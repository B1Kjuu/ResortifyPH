-- Add initial_role_selected flag to profiles table
-- This tracks whether a user has completed the first-time role selection

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS initial_role_selected boolean NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN profiles.initial_role_selected IS 'True after user completes the first-time role selection popup';