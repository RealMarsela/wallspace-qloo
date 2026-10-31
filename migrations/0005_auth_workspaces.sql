-- Lane B5: accounts, workspaces and ownership. Additive; the one table rebuild (connector_accounts) keeps every row.
-- Free product: no plans, tiers or billing columns anywhere.

-- Better Auth core tables (generated with getMigrations(...).compileMigrations(), better-auth 1.7).
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null);
create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);
create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");

-- A workspace is one brand/agency/act (buyer) or one media owner. The city is fixed to atlanta for this build.
-- composio_user_id is the one Composio user id for everything the workspace connects.
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'media-owner')),
  city TEXT NOT NULL DEFAULT 'atlanta',
  composio_user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces (id),
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
-- One workspace per user in this build; the unique index also settles a double submit.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);

-- step: tools (connect tools, optional) -> first (first brief / view faces) -> done. The workspace step is "no row yet".
CREATE TABLE IF NOT EXISTS onboarding_state (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces (id),
  step TEXT NOT NULL CHECK (step IN ('tools', 'first', 'done')),
  tools_skipped INTEGER NOT NULL DEFAULT 0,
  first_skipped INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

-- The demo workspace owns the sample plan, the earlier eval/prewarm rows and the single Composio demo connection. No member.
INSERT OR IGNORE INTO workspaces (id, name, role, city, composio_user_id, created_at)
VALUES ('ws-demo', 'Porchlight Comedy Tour (sample brand)', 'buyer', 'atlanta', 'wallspace-demo', '2026-10-30T00:00:00.000Z');
INSERT OR IGNORE INTO onboarding_state (workspace_id, step, updated_at, completed_at)
VALUES ('ws-demo', 'done', '2026-10-30T00:00:00.000Z', '2026-10-30T00:00:00.000Z');

-- Ownership of briefs and plans (runs follow their plan). Existing rows go to the demo workspace.
ALTER TABLE briefs ADD COLUMN workspace_id TEXT;
ALTER TABLE plans ADD COLUMN workspace_id TEXT;
UPDATE briefs SET workspace_id = 'ws-demo' WHERE workspace_id IS NULL;
UPDATE plans SET workspace_id = 'ws-demo' WHERE workspace_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_briefs_workspace ON briefs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_workspace ON plans (workspace_id, created_at DESC);

-- Connections per workspace: connector_accounts was keyed by provider alone (one demo record). It becomes keyed by
-- (user_id, provider) where user_id is the workspace's Composio user id; the demo row keeps 'wallspace-demo'.
CREATE TABLE connector_accounts_new (
  provider TEXT NOT NULL,
  composio_account_id TEXT,
  user_id TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, provider)
);
INSERT INTO connector_accounts_new (provider, composio_account_id, user_id, label, status, updated_at)
  SELECT provider, composio_account_id, user_id, label, status, updated_at FROM connector_accounts;
DROP TABLE connector_accounts;
ALTER TABLE connector_accounts_new RENAME TO connector_accounts;

-- Provider-level events (connected, disconnected, errors) have no plan; user_id scopes them to a workspace.
ALTER TABLE connector_events ADD COLUMN user_id TEXT;
UPDATE connector_events SET user_id = 'wallspace-demo' WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_connector_events_user ON connector_events (user_id, provider, at DESC);

-- Threads remember the sending workspace (its Composio user id) so read-back polls use the right connected account.
ALTER TABLE connector_threads ADD COLUMN user_id TEXT;
UPDATE connector_threads SET user_id = 'wallspace-demo' WHERE user_id IS NULL;
