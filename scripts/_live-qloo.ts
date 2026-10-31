// Shared by sample-plan.mts and qloo-cache-push.mts: a LIVE Qloo client over a file-backed copy of the KV cache, the sample brief, and the
// cache entries from the 30 Oct probe (real live Qloo responses, kept outside the repo in qloo-probe/). Nothing here is a fixture or a
// recording of an invented answer; a request that is not in the cache is a live call to Qloo, counted and written back.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Brief } from "../src/contract";
import { faces } from "../src/data/faces";
import { MemoryStore } from "../src/server/db/memory";
import type { KvLike } from "../src/server/db/bindings";
import type { QlooPort, ScoringPort } from "../src/server/agent/ports";
import { qlooPortFor } from "../src/server/agent/qloo-adapter";
import { scoringPort } from "../src/server/agent/scoring-adapter";
import { QlooClient } from "../src/server/qloo/client";
import { QLOO_CAPS } from "../src/server/qloo";
import { requestKey } from "../src/server/qloo/request-key";

export const CACHE_DIR = ".data/qloo-live-cache"; // gitignored: raw Qloo bodies are never committed
const PROBE = process.env.QLOO_PROBE_DIR ?? "../../qloo-probe";

export class FileKv implements KvLike {
  constructor(readonly dir = CACHE_DIR) { mkdirSync(dir, { recursive: true }); }
  private path(k: string) { return join(this.dir, `${k.replace(/[^a-z0-9]/gi, "_")}.json`); }
  async get(k: string) { return existsSync(this.path(k)) ? readFileSync(this.path(k), "utf8") : null; }
  async put(k: string, v: string) { writeFileSync(this.path(k), v); }
  async delete() { /* never evicted by scripts */ }
  keys(): { key: string; value: string }[] {
    return readdirSync(this.dir).filter((f) => f.startsWith("qloo_v1_")).map((f) => ({ key: `qloo:v1:${f.slice(8, -5)}`, value: readFileSync(join(this.dir, f), "utf8") }));
  }
}

/** The 200 answers in the shared probe ledger (real live calls made on 30 Oct) become cache entries under Wallspace's request key. */
export async function preloadProbe(kv: FileKv): Promise<number> {
  let n = 0;
  if (!existsSync(join(PROBE, "ledger.jsonl"))) return n; // no probe ledger (a fresh clone): every answer comes from a live call
  for (const line of readFileSync(join(PROBE, "ledger.jsonl"), "utf8").split("\n").filter(Boolean)) {
    const d = JSON.parse(line) as { product: string; endpoint: string; params: Record<string, string | number | boolean>; status: number; file: string };
    if (d.product !== "wallspace" || d.status !== 200) continue;
    const key = await requestKey(d.endpoint, d.params);
    if (await kv.get(key)) continue;
    await kv.put(key, JSON.stringify(JSON.parse(readFileSync(join(PROBE, d.file), "utf8"))));
    n++;
  }
  return n;
}

export const sampleBrief = (): Brief => ({
  id: "brief-sample", brandName: "Porchlight Comedy Tour (sample brand)", brandSample: true,
  audienceText: "people who would go to a comedy club on a Tuesday night", loves: ["stand-up comedy specials", "90s sitcoms", "southern hip-hop"], seeds: [],
  city: "atlanta", budgetUsd: 40000, flightStart: "2026-11-16", flightWeeks: 4, brandVoice: "warm, dry, a little cheeky", creativeUrl: null, createdAt: new Date().toISOString(),
});

export function liveAdapters(apiKey: string, kv: FileKv): { qloo: QlooPort; scoring: ScoringPort; faces: typeof faces; client: QlooClient; ledger: MemoryStore } {
  const ledger = new MemoryStore();
  const client = new QlooClient({ apiKey, kv, caps: QLOO_CAPS, store: ledger });
  return { qloo: qlooPortFor(client), scoring: scoringPort(), faces, client, ledger };
}
