import type { RunStep, Seed } from "@/contract";
import type { TokenFactory } from "../models";
import type { KvMin, QlooPort, VocabItem } from "./ports";

// Free-text brief -> Qloo tags and audiences by cosine against a cached vocabulary (Qwen3-Embedding-8B; not an NVIDIA model).

export function encodeVectors(vs: number[][]): string {
  const dim = vs[0]?.length ?? 0;
  const f = new Float32Array(vs.length * dim);
  vs.forEach((v, i) => f.set(v, i * dim));
  const bytes = new Uint8Array(f.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return JSON.stringify({ dim, n: vs.length, b64: btoa(bin) });
}

export function decodeVectors(raw: string): number[][] {
  const { dim, n, b64 } = JSON.parse(raw) as { dim: number; n: number; b64: string };
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const f = new Float32Array(bytes.buffer);
  return Array.from({ length: n }, (_, i) => Array.from(f.subarray(i * dim, (i + 1) * dim)));
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

async function hashIds(items: VocabItem[]): Promise<string> {
  const data = new TextEncoder().encode(items.map((i) => i.id).join("|"));
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...d].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const label = (i: VocabItem) => (i.kind === "audience" ? `${i.name} (audience)` : `${i.name} (${i.type.split(":").slice(-2, -1)[0] ?? "tag"})`);

export interface MatchResult {
  seeds: Seed[];
  steps: RunStep[];
  vocabSize: number;
}

// Embeds the vocabulary once (KV, keyed by the id list) and the brief text each run.
export async function matchSeeds(tf: TokenFactory, kv: KvMin, qloo: QlooPort, queries: string[], opts: { topK?: number; minSim?: number } = {}): Promise<MatchResult> {
  const topK = opts.topK ?? 6;
  const minSim = opts.minSim ?? 0.4;
  const steps: RunStep[] = [];
  const vocab = await qloo.vocabulary();
  const items = vocab.data;
  if (!items.length) return { seeds: [], steps, vocabSize: 0 };

  const key = `vocab:emb:v1:${await hashIds(items)}`;
  let vectors: number[][] | null = null;
  const hit = await kv.get(key);
  if (hit) {
    try {
      vectors = decodeVectors(hit);
    } catch {
      vectors = null;
    }
  }
  if (!vectors || vectors.length !== items.length) {
    vectors = [];
    let ms = 0;
    let costUsd = 0;
    let tokens = 0;
    let requestId: string | null = null;
    for (let i = 0; i < items.length; i += 128) {
      const e = await tf.embed(items.slice(i, i + 128).map(label), { title: "build the Qloo tag vocabulary embeddings" });
      vectors.push(...e.vectors);
      ms += e.step.ms;
      costUsd += e.step.costUsd ?? 0;
      tokens += e.step.tokensIn ?? 0;
      requestId = requestId ?? e.step.requestId;
    }
    await kv.put(key, encodeVectors(vectors));
    steps.push({ ...embedStep(`built ${items.length} tag and audience vectors once, saved to KV`, ms, tokens, costUsd, requestId, false) });
  }

  const q = await tf.embed(queries, { title: "map the brief to Qloo tags", tool: "embeddings cosine", summary: "" });
  const best = new Map<number, number>();
  q.vectors.forEach((qv) => vectors.forEach((v, idx) => best.set(idx, Math.max(best.get(idx) ?? -1, cosine(qv, v)))));
  const ranked = [...best.entries()].filter(([, s]) => s >= minSim).sort((a, b) => b[1] - a[1]).slice(0, topK);
  const seeds: Seed[] = ranked.map(([idx, sim]) => ({ qlooId: items[idx].id, name: items[idx].name, type: items[idx].type, via: items[idx].kind === "audience" ? "audience" : "embedding", similarity: Math.round(sim * 1000) / 1000 }));
  steps.push({ ...q.step, summary: `${queries.length} phrase(s) -> ${seeds.length} Qloo tags/audiences: ${seeds.map((s) => s.name).join(", ") || "none above the similarity floor"}` });
  return { seeds, steps, vocabSize: items.length };
}

function embedStep(summary: string, ms: number, tokensIn: number, costUsd: number, requestId: string | null, cached: boolean): RunStep {
  return {
    id: "embed-vocab", at: new Date().toISOString(), role: "embedding", model: "Qwen/Qwen3-Embedding-8B", title: "build the Qloo tag vocabulary embeddings",
    tool: "embeddings", summary, ms, tokensIn, tokensOut: 0, costUsd, requestId, cached, status: "ok",
  };
}
