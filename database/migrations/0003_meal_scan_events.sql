-- 0003_meal_scan_events.sql
-- Observability log for the AI meal-scan feature. No image data is ever
-- stored here or anywhere else — only the outcome (provider used, status,
-- identified food names/quantities).

CREATE TABLE IF NOT EXISTS meal_scan_events (
  id VARCHAR(64) PRIMARY KEY,
  subscriber_id VARCHAR(64) NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  provider_used VARCHAR(32),
  status VARCHAR(32) NOT NULL,
  confidence DOUBLE PRECISION,
  identified_items JSONB,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_scan_events_subscriber_idx
  ON meal_scan_events (subscriber_id, created_at);

-- Useful for spotting a provider quietly degrading before users complain.
CREATE INDEX IF NOT EXISTS meal_scan_events_provider_status_idx
  ON meal_scan_events (provider_used, status, created_at);
