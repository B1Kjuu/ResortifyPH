-- Add new columns to resorts table for enhanced resort information
-- Run this migration in your Supabase SQL Editor

ALTER TABLE resorts 
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '14:00:00',
ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS house_rules TEXT,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'flexible',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment to document the columns
COMMENT ON COLUMN resorts.bedrooms IS 'Number of bedrooms available';
COMMENT ON COLUMN resorts.bathrooms IS 'Number of bathrooms available';
COMMENT ON COLUMN resorts.contact_number IS 'Contact number for resort inquiries';
COMMENT ON COLUMN resorts.check_in_time IS 'Standard check-in time';
COMMENT ON COLUMN resorts.check_out_time IS 'Standard check-out time';
COMMENT ON COLUMN resorts.house_rules IS 'Resort house rules and policies';
COMMENT ON COLUMN resorts.cancellation_policy IS 'Cancellation policy type: flexible, moderate, strict, no-refund';
COMMENT ON COLUMN resorts.updated_at IS 'Timestamp of last update';

-- Create an updated_at trigger to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_resorts_updated_at ON resorts;
CREATE TRIGGER update_resorts_updated_at
    BEFORE UPDATE ON resorts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
