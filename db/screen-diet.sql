-- Run after Better Auth has created its user/session/account tables.
CREATE TABLE IF NOT EXISTS screen_diet_data (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  child_name text NOT NULL DEFAULT 'Alex',
  child_age integer NOT NULL DEFAULT 10 CHECK (child_age BETWEEN 6 AND 12),
  daily_limit_minutes integer NOT NULL DEFAULT 90 CHECK (daily_limit_minutes BETWEEN 1 AND 1440),
  blocked_keywords jsonb NOT NULL DEFAULT '["gambling"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS screen_diet_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS screen_diet_sessions_user_started_idx
  ON screen_diet_sessions (user_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS screen_diet_one_open_session_per_user_idx
  ON screen_diet_sessions (user_id) WHERE ended_at IS NULL;
