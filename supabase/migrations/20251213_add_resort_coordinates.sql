-- Add exact location coordinates to resorts table
-- This allows resort owners to pin their exact location on the map

ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add index for geo-queries (optional but helps with nearby searches)
CREATE INDEX IF NOT EXISTS idx_resorts_coordinates 
ON resorts (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN resorts.latitude IS 'Exact latitude coordinate of the resort';
COMMENT ON COLUMN resorts.longitude IS 'Exact longitude coordinate of the resort';
COMMENT ON COLUMN resorts.address IS 'Full street address of the resort';
