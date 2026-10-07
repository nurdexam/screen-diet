-- Run once in the Neon SQL Editor for the ScreenDiet database.
-- Better Auth core schema (generated from auth.ts).
CREATE TABLE IF NOT EXISTS "user" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text NOT NULL PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text NOT NULL PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- Legacy single-child table retained so existing installs can migrate their data.
CREATE TABLE IF NOT EXISTS screen_diet_data (
  user_id text PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  child_name text NOT NULL DEFAULT 'Alex',
  child_age integer NOT NULL DEFAULT 10 CHECK (child_age BETWEEN 6 AND 12),
  daily_limit_minutes integer NOT NULL DEFAULT 90 CHECK (daily_limit_minutes BETWEEN 1 AND 1440),
  blocked_keywords jsonb NOT NULL DEFAULT '["gambling"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS screen_diet_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Parent-managed child profiles. Each child's limits and filters are independent.
CREATE TABLE IF NOT EXISTS screen_diet_children (
  id text PRIMARY KEY,
  parent_user_id text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  child_name text NOT NULL,
  child_age integer NOT NULL CHECK (child_age BETWEEN 6 AND 12),
  daily_limit_minutes integer NOT NULL DEFAULT 90 CHECK (daily_limit_minutes BETWEEN 1 AND 1440),
  blocked_keywords jsonb NOT NULL DEFAULT '["gambling"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, id)
);

CREATE INDEX IF NOT EXISTS screen_diet_children_parent_idx
  ON screen_diet_children (parent_user_id, created_at, id);

-- Move the old child settings into one profile per existing parent. Re-running is safe.
INSERT INTO screen_diet_children (id, parent_user_id, child_name, child_age, daily_limit_minutes, blocked_keywords)
SELECT 'legacy_' || d.user_id, d.user_id, d.child_name, d.child_age, d.daily_limit_minutes, d.blocked_keywords
FROM screen_diet_data d
ON CONFLICT (id) DO NOTHING;

-- Parents without a legacy profile still get a default child profile.
INSERT INTO screen_diet_children (id, parent_user_id, child_name, child_age)
SELECT 'legacy_' || u."id", u."id", 'Alex', 10
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM screen_diet_children c WHERE c.parent_user_id = u."id"
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE screen_diet_sessions ADD COLUMN IF NOT EXISTS child_id text;

UPDATE screen_diet_sessions s
SET child_id = 'legacy_' || s.user_id
WHERE s.child_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'screen_diet_sessions_child_id_fkey'
  ) THEN
    ALTER TABLE screen_diet_sessions
      ADD CONSTRAINT screen_diet_sessions_child_id_fkey
      FOREIGN KEY (child_id) REFERENCES screen_diet_children (id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE screen_diet_sessions ALTER COLUMN child_id SET NOT NULL;

DROP INDEX IF EXISTS screen_diet_one_open_session_per_user_idx;
CREATE INDEX IF NOT EXISTS screen_diet_sessions_child_started_idx
  ON screen_diet_sessions (child_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS screen_diet_one_open_session_per_child_idx
  ON screen_diet_sessions (child_id) WHERE ended_at IS NULL;
