CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  clerk_session_id TEXT,
  event_type TEXT NOT NULL,
  intent TEXT,
  target_field_id TEXT,
  target_field_name TEXT,
  action_type TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms INTEGER,
  portal_domain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interaction_user_created
  ON interaction_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_portal_created
  ON interaction_logs (portal_domain, created_at DESC);

-- Optional TimescaleDB conversion. Run only on a TimescaleDB-enabled database.
-- SELECT create_hypertable('interaction_logs', 'created_at', if_not_exists => TRUE);
