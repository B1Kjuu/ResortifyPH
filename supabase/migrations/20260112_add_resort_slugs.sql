-- Add professional, stable slugs for public resort URLs

ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill slugs for existing resorts
WITH base AS (
  SELECT
    id,
    CASE
      WHEN name IS NULL OR btrim(name) = '' THEN 'resort-' || substring(id::text, 1, 8)
      ELSE lower(
        regexp_replace(
          regexp_replace(btrim(name), '[^a-zA-Z0-9]+', '-', 'g'),
          '(^-+|-+$)',
          '',
          'g'
        )
      )
    END AS slug_base
  FROM resorts
  WHERE slug IS NULL OR btrim(slug) = ''
),
filled AS (
  UPDATE resorts r
  SET slug = b.slug_base
  FROM base b
  WHERE r.id = b.id
  RETURNING r.id
),
dedupe AS (
  SELECT
    id,
    slug,
    row_number() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM resorts
  WHERE slug IS NOT NULL AND btrim(slug) <> ''
)
UPDATE resorts r
SET slug = r.slug || '-' || substring(replace(r.id::text, '-', ''), 1, 12) || '-' || d.rn
FROM dedupe d
WHERE r.id = d.id AND d.rn > 1;

-- Ensure uniqueness (allows NULLs to avoid breaking inserts during rollout)
CREATE UNIQUE INDEX IF NOT EXISTS resorts_slug_unique
ON resorts (slug)
WHERE slug IS NOT NULL AND btrim(slug) <> '';

ANALYZE resorts;
