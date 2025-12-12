-- Adds region metadata to resorts and bookings for analytics

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS region_code TEXT,
  ADD COLUMN IF NOT EXISTS region_name TEXT;

CREATE INDEX IF NOT EXISTS idx_resorts_region_code ON resorts (region_code);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS resort_province TEXT,
  ADD COLUMN IF NOT EXISTS resort_region_code TEXT,
  ADD COLUMN IF NOT EXISTS resort_region_name TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_resort_region_code ON bookings (resort_region_code);
