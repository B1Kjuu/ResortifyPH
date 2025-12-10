-- Additional resort fields migration for enhanced features
-- Run this after the initial migration

ALTER TABLE resorts 
ADD COLUMN IF NOT EXISTS day_tour_price DECIMAL,
ADD COLUMN IF NOT EXISTS night_tour_price DECIMAL,
ADD COLUMN IF NOT EXISTS overnight_price DECIMAL,
ADD COLUMN IF NOT EXISTS additional_guest_fee DECIMAL,
ADD COLUMN IF NOT EXISTS pool_size TEXT,
ADD COLUMN IF NOT EXISTS pool_depth TEXT,
ADD COLUMN IF NOT EXISTS has_pool_heating BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_jacuzzi BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parking_slots INTEGER,
ADD COLUMN IF NOT EXISTS nearby_landmarks TEXT,
ADD COLUMN IF NOT EXISTS bring_own_items TEXT;

-- Add comments
COMMENT ON COLUMN resorts.day_tour_price IS 'Day tour pricing (8 AM - 5 PM)';
COMMENT ON COLUMN resorts.night_tour_price IS 'Night tour pricing (6 PM - 12 AM)';
COMMENT ON COLUMN resorts.overnight_price IS 'Overnight stay pricing (20-22 hours)';
COMMENT ON COLUMN resorts.additional_guest_fee IS 'Fee per additional guest beyond capacity';
COMMENT ON COLUMN resorts.pool_size IS 'Swimming pool dimensions';
COMMENT ON COLUMN resorts.pool_depth IS 'Swimming pool depth';
COMMENT ON COLUMN resorts.has_pool_heating IS 'Whether pool has heating feature';
COMMENT ON COLUMN resorts.has_jacuzzi IS 'Whether jacuzzi is available';
COMMENT ON COLUMN resorts.parking_slots IS 'Number of available parking spaces';
COMMENT ON COLUMN resorts.nearby_landmarks IS 'Nearby landmarks and distances';
COMMENT ON COLUMN resorts.bring_own_items IS 'Items guests should bring themselves';
