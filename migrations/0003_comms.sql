-- Lane B3: comms connectors (Composio mail, Slack approvals). Additive only.

-- One row per connected provider for the demo workspace (account label only, never a token).
CREATE TABLE IF NOT EXISTS connector_accounts (
  provider TEXT PRIMARY KEY,
  composio_account_id TEXT,
  user_id TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Event log shown on the plan page and /app/connections. dedupe_key makes inbound deliveries idempotent.
CREATE TABLE IF NOT EXISTS connector_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  plan_id TEXT,
  direction TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  dedupe_key TEXT UNIQUE,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_connector_events_plan ON connector_events (plan_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_events_provider ON connector_events (provider, at DESC);

-- Outbound messages: lets a reply (or a Slack click) find its plan. thread_id = Gmail thread / Slack message ts.
CREATE TABLE IF NOT EXISTS connector_threads (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  thread_id TEXT,
  message_id TEXT,
  token TEXT NOT NULL,
  recipient TEXT,
  sent_at TEXT NOT NULL,
  last_checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_connector_threads_plan ON connector_threads (plan_id, provider);
CREATE INDEX IF NOT EXISTS idx_connector_threads_thread ON connector_threads (provider, thread_id);

-- Composio webhook ids already handled.
CREATE TABLE IF NOT EXISTS composio_webhook_seen (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL
);
