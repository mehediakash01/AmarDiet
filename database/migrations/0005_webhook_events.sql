-- 0005_webhook_events.sql
-- Migration: Add webhook_events table for idempotent external callbacks (Bdapps)
-- Reversible: See DOWN section at the bottom

CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(128) NOT NULL UNIQUE,
  provider VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_event_id_idx ON webhook_events (event_id);
CREATE INDEX IF NOT EXISTS webhook_events_provider_idx ON webhook_events (provider);

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK):
-- DROP INDEX IF EXISTS webhook_events_provider_idx;
-- DROP INDEX IF EXISTS webhook_events_event_id_idx;
-- DROP TABLE IF EXISTS webhook_events;
-- ============================================================================
