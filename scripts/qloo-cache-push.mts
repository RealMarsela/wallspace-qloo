// Copies the live-filled Qloo cache (.data/qloo-live-cache: raw responses to real live calls) into production KV WS_KV under the keys the
// app reads (qloo:v1:<hash>), 14-day TTL like the app's own writes. Use scripts/qloo-cache-push.sh. WS_KV only, never WS_KV_NEBIUS.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileKv } from "./_live-qloo";

const entries = new FileKv().keys().map((e) => ({ key: e.key, value: e.value, expiration_ttl: 14 * 86400 }));
process.stdout.write(`${entries.length} cache entries -> WS_KV\n`);
const tmp = mkdtempSync(join(tmpdir(), "ws-qloo-cache-"));
const file = join(tmp, "bulk.json");
writeFileSync(file, JSON.stringify(entries));
try {
  execFileSync("npx", ["wrangler", "kv", "bulk", "put", file, "--binding", "WS_KV", "--remote"], { stdio: "inherit" });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
