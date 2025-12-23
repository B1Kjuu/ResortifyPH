-- Prevent overlapping confirmed bookings per resort
-- Requires btree_gist for exclusion constraint on non-range + range columns
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1) Clean identical duplicates first: same resort + same exact dates
WITH dups AS (
  SELECT resort_id, date_from, date_to,
         ARRAY_AGG(id ORDER BY created_at) AS ids
  FROM public.bookings
  WHERE status = 'confirmed'
  GROUP BY resort_id, date_from, date_to
  HAVING COUNT(*) > 1
)
UPDATE public.bookings b
SET status = 'rejected'
FROM dups
WHERE b.status = 'confirmed'
  AND b.resort_id = dups.resort_id
  AND b.date_from = dups.date_from
  AND b.date_to = dups.date_to
  AND b.id <> (dups.ids)[1];

-- 2) Clean overlapping conflicts: keep the earlier booking, reject newer overlapping ones
UPDATE public.bookings b1
SET status = 'rejected'
WHERE b1.status = 'confirmed'
  AND EXISTS (
    SELECT 1
    FROM public.bookings b2
    WHERE b2.resort_id = b1.resort_id
      AND b2.id <> b1.id
      AND b2.status = 'confirmed'
      AND daterange(b1.date_from, b1.date_to, '[]') && daterange(b2.date_from, b2.date_to, '[]')
      AND b2.created_at < b1.created_at
  );

-- Exclusion constraint: for the same resort_id, confirmed bookings cannot have overlapping date ranges
-- Uses inclusive daterange on [date_from, date_to]
-- 3) Add the exclusion constraint to prevent future overlaps
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    resort_id WITH =,
    daterange(date_from, date_to, '[]') WITH &&
  )
  WHERE (status = 'confirmed');

COMMIT;
