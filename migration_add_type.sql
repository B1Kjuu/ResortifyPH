-- Migration script to add type column to existing resorts table
-- Run this in Supabase SQL editor if you already have the resorts table

-- Add type column to resorts table
ALTER TABLE resorts 
ADD COLUMN IF NOT EXISTS type text 
CHECK (type IN ('beach','mountain','nature','city','countryside')) 
DEFAULT 'city';

-- Optional: Update existing rows based on keywords (one-time migration)
UPDATE resorts 
SET type = 'beach'
WHERE type IS NULL 
AND (
  LOWER(name) LIKE '%beach%' OR 
  LOWER(description) LIKE '%beach%' OR 
  LOWER(description) LIKE '%ocean%' OR
  LOWER(description) LIKE '%sea%'
);

UPDATE resorts 
SET type = 'mountain'
WHERE type IS NULL 
AND (
  LOWER(name) LIKE '%mountain%' OR 
  LOWER(description) LIKE '%mountain%' OR
  LOWER(description) LIKE '%highland%'
);

UPDATE resorts 
SET type = 'nature'
WHERE type IS NULL 
AND (
  LOWER(name) LIKE '%nature%' OR 
  LOWER(description) LIKE '%forest%' OR 
  LOWER(description) LIKE '%eco%' OR
  LOWER(description) LIKE '%farm%'
);

-- Set default for any remaining NULL values
UPDATE resorts 
SET type = 'city'
WHERE type IS NULL;
