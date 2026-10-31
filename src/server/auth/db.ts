import type { D1Like } from "../db/bindings";
import type { Env } from "./env";
import { ApiFailure } from "./errors";

let dev: Promise<D1Like> | undefined;

/**
 * The database auth reads: the WS_DB binding on Workers. Outside production with no binding (`next dev`) it is a SQLite file under
 * os.tmpdir() with the repo's migrations applied, so sign-up works locally. Production without a binding is an error.
 */
export async function authDb(env: Env): Promise<D1Like> {
  if (env.WS_DB) return env.WS_DB;
  if (process.env.NODE_ENV === "production") throw new ApiFailure(503, "auth_not_configured", "Accounts are not available right now.");
  dev ??= (async () => {
    const { openDevD1, applyMigrations } = await import("./dev-d1");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const db = await openDevD1(String(env.AUTH_DEV_DB ?? join(tmpdir(), "wallspace-dev-auth.sqlite")));
    await applyMigrations(db, join(process.cwd(), "migrations"));
    return db;
  })();
  return dev;
}
