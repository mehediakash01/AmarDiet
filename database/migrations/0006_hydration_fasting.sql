CREATE TABLE IF NOT EXISTS "water_logs" (
  "id" varchar(64) PRIMARY KEY,
  "subscriber_id" varchar(64) NOT NULL REFERENCES "subscribers"("id") ON DELETE CASCADE,
  "logged_on" varchar(16) NOT NULL,
  "amount_ml" integer NOT NULL DEFAULT 0,
  "target_ml" integer NOT NULL DEFAULT 2500,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "water_logs_subscriber_date_idx" ON "water_logs" ("subscriber_id", "logged_on");

CREATE TABLE IF NOT EXISTS "fasting_sessions" (
  "subscriber_id" varchar(64) PRIMARY KEY REFERENCES "subscribers"("id") ON DELETE CASCADE,
  "mode" varchar(32) NOT NULL DEFAULT '16_8',
  "start_time" timestamp with time zone NOT NULL,
  "target_hours" integer NOT NULL DEFAULT 16,
  "is_active" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
