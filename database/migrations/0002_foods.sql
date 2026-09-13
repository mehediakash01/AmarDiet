-- 0002_foods.sql
-- The universal food catalog table. Previously this data only ever lived
-- in a static TypeScript file and an in-memory Map, so it never persisted
-- and admin edits were lost on restart. This table is now the real source
-- of truth; the static dataset becomes seed data only.

CREATE TABLE IF NOT EXISTS foods (
  id VARCHAR(64) PRIMARY KEY,
  canonical_name VARCHAR(256) NOT NULL,
  local_names JSONB NOT NULL DEFAULT '[]',
  aliases JSONB NOT NULL DEFAULT '[]',
  cuisine_tags JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(64) NOT NULL,
  calories_per_100g DOUBLE PRECISION NOT NULL,
  protein_per_100g DOUBLE PRECISION NOT NULL,
  carbs_per_100g DOUBLE PRECISION NOT NULL,
  fat_per_100g DOUBLE PRECISION NOT NULL,
  fiber_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0,
  common_servings JSONB NOT NULL DEFAULT '[]',
  source VARCHAR(128),
  source_version VARCHAR(32),
  verified_at VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foods_canonical_name_idx
  ON foods (canonical_name);
