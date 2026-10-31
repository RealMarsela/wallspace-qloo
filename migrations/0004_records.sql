-- Lane B4 records connectors: external ids per plan (HubSpot, Sheets, Calendar) and the sync log.

-- One row per external object a plan owns in a customer tool. `snapshot` is the last state read back from the
-- provider, so the cron poll and the webhooks can diff and report only real changes.
CREATE TABLE IF NOT EXISTS record_links (
  plan_id      TEXT NOT NULL,
  provider     TEXT NOT NULL,  -- hubspot | google-sheets | google-calendar | outlook-calendar
  kind         TEXT NOT NULL,  -- company | contact | deal | note | spreadsheet | event-creative | event-posting | event-takedown
  external_id  TEXT NOT NULL,  -- hubspot id, spreadsheet id, calendar event id
  url          TEXT,
  snapshot     TEXT,           -- JSON
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (plan_id, provider, kind, external_id)
);
CREATE INDEX IF NOT EXISTS idx_record_links_provider ON record_links (provider, kind);

-- Sync log: every write out and every change read back in.
CREATE TABLE IF NOT EXISTS record_sync_log (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT NOT NULL,
  provider   TEXT NOT NULL,
  direction  TEXT NOT NULL CHECK (direction IN ('out', 'in')),
  kind       TEXT NOT NULL,
  summary    TEXT NOT NULL,
  detail     TEXT,             -- JSON
  ok         INTEGER NOT NULL DEFAULT 1,
  at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_record_sync_log_plan ON record_sync_log (plan_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_record_sync_log_provider ON record_sync_log (provider, at DESC);
