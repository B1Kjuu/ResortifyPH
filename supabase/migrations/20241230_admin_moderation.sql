-- Admin Moderation Enhancements Migration
-- Run this migration to add user suspension and content moderation support

-- Add suspension fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_reason text,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Add is_hidden field to reviews for content moderation
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Add is_hidden field to chat_messages for content moderation
-- Note: Using chat_messages table (not 'messages')
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Create reports table if not exists (with proper schema)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reported_type text NOT NULL CHECK (reported_type IN ('review', 'message', 'user', 'resort', 'booking')),
  reported_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  admin_notes text,
  
  -- Legacy columns for backwards compatibility
  chat_id uuid,
  message_id uuid,
  target_user_id uuid
);

-- Create index on reports status for faster filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Create moderation_actions table if not exists
CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS policies for reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create reports
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Allow users to view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- Allow admins to view all reports
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Allow admins to update reports
DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- RLS policies for moderation_actions
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can insert moderation actions
DROP POLICY IF EXISTS "Admins can insert moderation actions" ON moderation_actions;
CREATE POLICY "Admins can insert moderation actions" ON moderation_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Only admins can view moderation actions
DROP POLICY IF EXISTS "Admins can view moderation actions" ON moderation_actions;
CREATE POLICY "Admins can view moderation actions" ON moderation_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update reviews RLS to allow admins to hide reviews
DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
CREATE POLICY "Admins can update reviews" ON reviews
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update chat_messages RLS to allow admins to hide messages
DROP POLICY IF EXISTS "Admins can update chat_messages" ON chat_messages;
CREATE POLICY "Admins can update chat_messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Allow admins to update any profile (for suspension)
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  );
