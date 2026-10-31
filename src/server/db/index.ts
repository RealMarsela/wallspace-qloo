import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WallspaceEnv } from "./bindings";
import { D1Store } from "./d1";
import { MemoryStore } from "./memory";
import type { Store } from "./types";

export type { Store, SignoffRow, LedgerRow } from "./types";
export type { WallspaceEnv } from "./bindings";
export { MemoryStore } from "./memory";
export { buildLimits } from "./limits";

/** Cloudflare bindings on Workers; process.env under `next dev`, scripts and tests. Bindings win. */
export function runtimeEnv(): WallspaceEnv & Record<string, unknown> {
  let bindings: Record<string, unknown> = {};
  try {
    bindings = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    // not on workerd
  }
  return { ...(process.env as Record<string, unknown>), ...bindings } as WallspaceEnv & Record<string, unknown>;
}

const cache = new WeakMap<object, Store>();
let fileStore: Store | undefined;
let memoryStore: Store | undefined;

/**
 * Pick the store by STORE_DRIVER (d1 | file | memory). d1 needs the WS_DB binding and falls back to the file driver when it is absent
 * (plain `next dev`). Unset means d1 when bound, else file (os.tmpdir()/wallspace-dev-store.json, or STORE_FILE). Memory is for tests only and survives the process, not a restart.
 */
export async function getStore(env: WallspaceEnv & Record<string, unknown> = runtimeEnv()): Promise<Store> {
  const want = env.STORE_DRIVER ?? (env.WS_DB ? "d1" : "file");
  if (want === "d1" && env.WS_DB) {
    const db = env.WS_DB as object;
    let s = cache.get(db);
    if (!s) cache.set(db, (s = new D1Store(env.WS_DB)));
    return s;
  }
  if (want === "memory") return (memoryStore ??= new MemoryStore());
  if (!fileStore) {
    const { FileStore } = await import("./file");
    // Outside the project tree: a store inside it makes `next dev` reload on every write. Override with STORE_FILE.
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    fileStore = new FileStore(String(env.STORE_FILE ?? join(tmpdir(), "wallspace-dev-store.json")));
  }
  return fileStore;
}
