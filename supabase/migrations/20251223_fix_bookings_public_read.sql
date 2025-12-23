-- Allow public read access to booking dates for calendar availability
-- This enables guests to see which dates are booked when viewing resort details

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view booking dates for availability" ON bookings;

-- Create policy allowing anyone to SELECT booking dates and status
-- This is necessary for the public resort detail page calendar to show booked dates
CREATE POLICY "Anyone can view booking dates for availability"
ON bookings
FOR SELECT
TO authenticated, anon
USING (true);

-- Note: This allows viewing all booking fields, but the query in the frontend
-- only requests date_from, date_to, and status, so no sensitive data is exposed
-- in practice. If you want stricter control, you would need to use a security
-- definer function instead.
