-- 0007_exercise_logs.sql
-- Exercise log: one row per logged session. Matches exerciseLogs in
-- apps/api/src/infrastructure/db/schema.ts.
-- calories_burned and met are computed by the API (nutrition-engine) at the
-- time of logging and stored, so old entries keep their value even if the
-- activity catalog or the user's weight changes later.

CREATE TABLE IF NOT EXISTS "exercise_logs" (
  "id" varchar(64) PRIMARY KEY,
  "subscriber_id" varchar(64) NOT NULL REFERENCES "subscribers"("id") ON DELETE CASCADE,
  "logged_on" varchar(16) NOT NULL,
  "activity_key" varchar(64) NOT NULL,
  "activity_name" varchar(128) NOT NULL,
  "minutes" integer NOT NULL,
  "met" double precision NOT NULL,
  "calories_burned" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "exercise_logs_subscriber_date_idx" ON "exercise_logs" ("subscriber_id", "logged_on");
