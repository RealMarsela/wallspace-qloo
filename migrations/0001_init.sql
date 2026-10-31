-- Wallspace core tables (lane B1). Complex objects are stored as JSON beside the columns the app filters and sorts on.
-- Later migrations are additive: 0002 (agent/jobs, B2), 0003 (comms connectors, B3), 0004 (records connectors, B4).

CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL,
  sample INTEGER NOT NULL DEFAULT 0,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plans_created ON plans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_brief ON plans (brief_id);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_plan ON runs (plan_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_kind ON runs (kind, started_at DESC);

-- One row per RunStep (model call, tool call, guard check); seq orders them inside a run.
CREATE TABLE IF NOT EXISTS run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  at TEXT NOT NULL,
  role TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL,
  cached INTEGER NOT NULL DEFAULT 0,
  json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps (run_id, seq);

-- Copy lines checked by the live guard and, later, the NeMo job. engine: live-guard | nemo-guardrails.
CREATE TABLE IF NOT EXISTS plan_signoffs (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  face_id TEXT,
  line_index INTEGER,
  engine TEXT NOT NULL,
  status TEXT NOT NULL,
  text TEXT NOT NULL,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signoffs_plan ON plan_signoffs (plan_id);

-- Every call to a metered provider: live or cached. The /api/limits page and the Qloo cap read this.
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  provider TEXT NOT NULL,          -- qloo | tavily | token-factory
  endpoint TEXT NOT NULL,
  request_key TEXT,
  cached INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL,              -- live | replay
  status TEXT NOT NULL,            -- ok | error | blocked
  ms INTEGER,
  cost_usd REAL,
  plan_id TEXT,
  run_id TEXT,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_provider ON ledger (provider, at DESC);

-- Small keyed values written by other lanes: guard.live, nemo.stats, qloo.coverage_gaps, notes.
CREATE TABLE IF NOT EXISTS metrics (
  key TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
