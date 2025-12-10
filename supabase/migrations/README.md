# Database Migration - Resort Fields Enhancement

## Overview

This migration adds enhanced fields to the resorts table to provide more comprehensive resort information.

## New Fields Added

1. **bedrooms** (INTEGER) - Number of bedrooms available
2. **bathrooms** (INTEGER) - Number of bathrooms available
3. **contact_number** (TEXT) - Contact number for resort inquiries (Required)
4. **check_in_time** (TIME) - Standard check-in time (Default: 14:00)
5. **check_out_time** (TIME) - Standard check-out time (Default: 12:00)
6. **house_rules** (TEXT) - Resort house rules and policies
7. **cancellation_policy** (TEXT) - Cancellation policy type (Default: 'flexible')
   - Options: `flexible`, `moderate`, `strict`, `no-refund`
8. **updated_at** (TIMESTAMP) - Timestamp of last update (auto-updated)

## How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `20251211_add_resort_fields.sql`
4. Paste and run the SQL script
5. Verify the columns were added successfully

### Option 2: Supabase CLI

```bash
supabase db push
```

## Verification

After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'resorts'
AND column_name IN ('bedrooms', 'bathrooms', 'contact_number', 'check_in_time', 'check_out_time', 'house_rules', 'cancellation_policy', 'updated_at');
```

## Impact

- Existing resorts will have NULL values for the new optional fields
- The `updated_at` trigger will automatically update timestamps on any resort modifications
- Forms have been updated to collect this information for new resorts
- Edit functionality now supports updating these fields

## Rollback

If you need to rollback this migration:

```sql
ALTER TABLE resorts
DROP COLUMN IF EXISTS bedrooms,
DROP COLUMN IF EXISTS bathrooms,
DROP COLUMN IF EXISTS contact_number,
DROP COLUMN IF EXISTS check_in_time,
DROP COLUMN IF EXISTS check_out_time,
DROP COLUMN IF EXISTS house_rules,
DROP COLUMN IF EXISTS cancellation_policy,
DROP COLUMN IF EXISTS updated_at;

DROP TRIGGER IF EXISTS update_resorts_updated_at ON resorts;
DROP FUNCTION IF EXISTS update_updated_at_column();
```
