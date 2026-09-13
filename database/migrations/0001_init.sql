-- 0001_init.sql
-- Core tables: subscribers, profiles, food_logs, diet_plans, weight_logs
-- Matches apps/api/src/infrastructure/db/schema.ts exactly.

CREATE TABLE IF NOT EXISTS subscribers (
  id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  subscriber_id VARCHAR(64) PRIMARY KEY REFERENCES subscribers(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  sex VARCHAR(16) NOT NULL,
  height_cm DOUBLE PRECISION NOT NULL,
  weight_kg DOUBLE PRECISION NOT NULL,
  activity_level VARCHAR(32) NOT NULL,
  goal VARCHAR(32) NOT NULL,
  target_weight_kg DOUBLE PRECISION,
  dietary_preferences JSONB,
  cuisine_preference VARCHAR(32) NOT NULL DEFAULT 'mixed',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_logs (
  id VARCHAR(64) PRIMARY KEY,
  subscriber_id VARCHAR(64) NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  logged_on VARCHAR(16) NOT NULL,
  meal_slot VARCHAR(16) NOT NULL,
  food_id VARCHAR(64) NOT NULL,
  food_name VARCHAR(256),
  quantity DOUBLE PRECISION NOT NULL,
  unit VARCHAR(64) NOT NULL DEFAULT 'g',
  calculated_nutrition JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_logs_subscriber_date_idx
  ON food_logs (subscriber_id, logged_on);

CREATE TABLE IF NOT EXISTS diet_plans (
  id VARCHAR(64) PRIMARY KEY,
  subscriber_id VARCHAR(64) NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  calorie_target DOUBLE PRECISION NOT NULL,
  protein_target_g DOUBLE PRECISION NOT NULL,
  carbs_target_g DOUBLE PRECISION NOT NULL,
  fat_target_g DOUBLE PRECISION NOT NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diet_plans_subscriber_idx
  ON diet_plans (subscriber_id);

CREATE TABLE IF NOT EXISTS weight_logs (
  id VARCHAR(64) PRIMARY KEY,
  subscriber_id VARCHAR(64) NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  weight_kg DOUBLE PRECISION NOT NULL,
  logged_on VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weight_logs_subscriber_date_idx
  ON weight_logs (subscriber_id, logged_on);
