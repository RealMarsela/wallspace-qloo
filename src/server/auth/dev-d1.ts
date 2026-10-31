import type { D1Like, D1Result, D1Statement } from "../db/bindings";

// A D1-shaped wrapper over node:sqlite, for `next dev` (no D1 binding) and vitest. Never loaded on Workers: the import below is
// computed so no bundler resolves it, and `authDb` only reaches it when there is no WS_DB binding outside production.
interface SqliteStmt {
  all(...v: unknown[]): Record<string, unknown>[];
  run(...v: unknown[]): { changes: number | bigint };
}
interface SqliteDb {
  prepare(sql: string): SqliteStmt;
  exec(sql: string): void;
}

const plain = (v: unknown): unknown => {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  return v;
};

class Stmt implements D1Statement {
  private values: unknown[] = [];
  constructor(private readonly db: SqliteDb, private readonly sql: string) {}
  bind(...values: unknown[]): D1Statement {
    this.values = values.map(plain);
    return this;
  }
  private rows(): Record<string, unknown>[] {
    return this.db.prepare(this.sql).all(...this.values).map((r) => ({ ...r }));
  }
  async run(): Promise<D1Result> {
    const isRead = /^\s*(select|pragma|with)\b/i.test(this.sql) || /\breturning\b/i.test(this.sql);
    if (isRead) return { results: this.rows(), success: true, meta: { changes: 0 } };
    const r = this.db.prepare(this.sql).run(...this.values);
    return { results: [], success: true, meta: { changes: Number(r.changes) } };
  }
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (this.rows()[0] as T | undefined) ?? null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return { results: this.rows() as T[], success: true, meta: {} };
  }
}

export interface DevD1 extends D1Like {
  exec(sql: string): void;
}

export async function openDevD1(path: string): Promise<DevD1> {
  const spec = ["node", "sqlite"].join(":");
  const mod = (await import(/* webpackIgnore: true */ spec)) as { DatabaseSync: new (p: string) => SqliteDb };
  const db = new mod.DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;");
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(statements: D1Statement[]) {
      db.exec("BEGIN");
      try {
        const out: D1Result[] = [];
        for (const s of statements) out.push(await s.run());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    exec: (sql: string) => db.exec(sql),
  };
}

/** Applies migrations/*.sql in order, once each (tracked in _dev_migrations). For the dev database and tests only. */
export async function applyMigrations(db: DevD1, dir: string): Promise<void> {
  const { readdir, readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  db.exec("CREATE TABLE IF NOT EXISTS _dev_migrations (name TEXT PRIMARY KEY)");
  const done = new Set(((await db.prepare("SELECT name FROM _dev_migrations").all<{ name: string }>()).results).map((r) => r.name));
  for (const name of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(name)) continue;
    db.exec(await readFile(join(dir, name), "utf8"));
    await db.prepare("INSERT INTO _dev_migrations (name) VALUES (?)").bind(name).run();
  }
}
