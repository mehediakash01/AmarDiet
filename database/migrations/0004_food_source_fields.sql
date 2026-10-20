-- 0004_food_source_fields.sql
-- Migration: Add food_source enum, is_verified, barcode, and indexes
--
-- REVERSIBLE MIGRATION:
-- To roll back this migration, execute the SQL statements in the DOWN section
-- at the bottom of this file.

DO $$ BEGIN
  CREATE TYPE food_source AS ENUM ('SEED', 'USDA', 'OPEN_FOOD_FACTS', 'USER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Add is_verified column (default false)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Add barcode column (nullable, unique for packaged item lookups)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS barcode VARCHAR(64) UNIQUE;

-- 3. Normalize existing data in source column before converting to enum
UPDATE foods
SET source = CASE
  WHEN source IN ('SEED', 'USDA', 'OPEN_FOOD_FACTS', 'USER') THEN source
  WHEN source ILIKE '%usda%' THEN 'USDA'
  WHEN source ILIKE '%open%food%' THEN 'OPEN_FOOD_FACTS'
  ELSE 'SEED'
END
WHERE source IS NOT NULL;

-- Default null source values to 'SEED'
UPDATE foods SET source = 'SEED' WHERE source IS NULL;

-- Bengali/core catalog seeds are verified
UPDATE foods SET is_verified = true WHERE source = 'SEED';

-- Alter source column to use the enum type with SEED default
ALTER TABLE foods 
  ALTER COLUMN source TYPE food_source 
  USING (source::food_source);

ALTER TABLE foods ALTER COLUMN source SET DEFAULT 'SEED'::food_source;
ALTER TABLE foods ALTER COLUMN source SET NOT NULL;

-- 4. Create search & lookup indexes
CREATE INDEX IF NOT EXISTS foods_source_idx ON foods(source);
CREATE INDEX IF NOT EXISTS foods_is_verified_idx ON foods(is_verified);
CREATE INDEX IF NOT EXISTS foods_barcode_idx ON foods(barcode);
CREATE INDEX IF NOT EXISTS foods_canonical_name_idx ON foods(canonical_name);

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK INSTRUCTIONS):
--
-- To revert this migration, run the following SQL statements:
--
-- DROP INDEX IF EXISTS foods_barcode_idx;
-- DROP INDEX IF EXISTS foods_is_verified_idx;
-- DROP INDEX IF EXISTS foods_source_idx;
-- ALTER TABLE foods ALTER COLUMN source DROP NOT NULL;
-- ALTER TABLE foods ALTER COLUMN source DROP DEFAULT;
-- ALTER TABLE foods ALTER COLUMN source TYPE VARCHAR(128) USING (source::text);
-- DROP TYPE IF EXISTS food_source;
-- ALTER TABLE foods DROP COLUMN IF EXISTS barcode;
-- ALTER TABLE foods DROP COLUMN IF EXISTS is_verified;
-- ============================================================================
