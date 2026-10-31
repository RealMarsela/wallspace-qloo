import type { z } from "zod";
import type { Store } from "../db/types";
import type { DurableNsLike, KvLike } from "../db/bindings";
import { DEFAULT_CAPS, QlooMeterCore, type MeterResult, type MeterStorage } from "./meter-core";
import { requestKey } from "./request-key";
import { ErrorResp, QLOO_BASE, QlooError, type QlooKind, type QlooMode, type QlooParams } from "./types";

// KV copies of live answers: 14 days (block taste by place does not move faster; the key has a monthly pool to protect).
const CACHE_TTL_S = 60 * 60 * 24 * 14;
class MapStorage implements MeterStorage {
  private readonly data = new Map<string, unknown>();
  async get<T>(k: string) { return this.data.get(k) as T | undefined; }
  async put<T>(k: string, v: T) { this.data.set(k, JSON.parse(JSON.stringify(v))); }
}
// Dev and tests without the QLOO_METER Durable Object: the caps hold per process.
const processMeter = new QlooMeterCore(new MapStorage());
/** A fresh in-process meter (tests). */
export const newLocalMeter = () => new QlooMeterCore(new MapStorage());

export interface QlooDeps {
  apiKey?: string;
  kv?: KvLike;
  meter?: DurableNsLike; // QLOO_METER
  localMeter?: QlooMeterCore; // used when no Durable Object is bound; defaults to one per process
  caps?: { total: number; day: number };
  store?: Store; // ledger rows go here
  fetchImpl?: typeof fetch;
  now?: () => number;
  base?: string;
  context?: { planId?: string; runId?: string };
}

/** How an answer was produced: shown in run steps. */
export interface QlooSource {
  mode: QlooMode;
  cached: boolean; // true: a KV copy of an earlier live answer, no Qloo call was made now
  requestId: string | null; // x-qloo-request-id of the live call; null for a KV copy
  key: string;
  ms: number;
}
export interface QlooResult<T> { data: T; source: QlooSource }

export class QlooClient {
  constructor(private readonly d: QlooDeps) {}

  get mode(): QlooMode { return "live"; }

  private async ledger(row: { endpoint: string; key: string; cached: boolean; status: "ok" | "error" | "blocked"; ms: number; note?: string }) {
    if (!this.d.store) return;
    await this.d.store.appendLedger({
      id: `qloo-${(this.d.now ?? Date.now)().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date((this.d.now ?? Date.now)()).toISOString(), provider: "qloo", endpoint: row.endpoint, requestKey: row.key, cached: row.cached,
      mode: "live", status: row.status, ms: row.ms, costUsd: null, planId: this.d.context?.planId ?? null, runId: this.d.context?.runId ?? null, note: row.note ?? null,
    }).catch(() => undefined); // a ledger failure never fails a taste lookup
  }

  private async reserve(): Promise<MeterResult> {
    const caps = this.d.caps ?? DEFAULT_CAPS;
    if (!this.d.meter) return (this.d.localMeter ?? processMeter).reserve(1, caps);
    const stub = this.d.meter.get(this.d.meter.idFromName("qloo"));
    const res = await stub.fetch("https://qloo-meter/reserve", { method: "POST", body: JSON.stringify({ n: 1 }) });
    return (await res.json()) as MeterResult;
  }
  private async refund(): Promise<void> {
    if (!this.d.meter) { await (this.d.localMeter ?? processMeter).refund(1, this.d.caps ?? DEFAULT_CAPS); return; }
    await this.d.meter.get(this.d.meter.idFromName("qloo")).fetch("https://qloo-meter/refund", { method: "POST", body: JSON.stringify({ n: 1 }) }).catch(() => undefined);
  }

  async call<T>(kind: QlooKind, endpoint: string, params: QlooParams, schema: z.ZodType<T>): Promise<QlooResult<T>> {
    const now = this.d.now ?? Date.now;
    const t0 = now();
    const key = await requestKey(endpoint, params);
    const done = (data: T, s: Pick<QlooSource, "cached" | "requestId">): QlooResult<T> => ({ data, source: { mode: "live", ...s, key, ms: now() - t0 } });
    const parse = (raw: unknown): T => {
      const r = schema.safeParse(raw);
      if (!r.success) throw new QlooError(`Qloo ${endpoint} answered in an unexpected shape.`, "shape");
      return r.data;
    };

    if (!this.d.apiKey) throw new QlooError("Qloo is not configured.", "no_key");
    const cached = await this.d.kv?.get(key);
    if (cached) {
      let data: T | null = null;
      try { data = parse(JSON.parse(cached)); } catch { /* an unreadable copy is ignored and the call goes live */ }
      if (data !== null) {
        await this.ledger({ endpoint, key, cached: true, status: "ok", ms: now() - t0, note: "kv cache" });
        return done(data, { cached: true, requestId: null });
      }
    }
    const gate = await this.reserve();
    if (!gate.ok) {
      await this.ledger({ endpoint, key, cached: false, status: "blocked", ms: now() - t0, note: gate.reason });
      throw new QlooError("The Qloo call budget is used up.", "cap_reached", 429);
    }
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    let res: Response;
    try {
      res = await (this.d.fetchImpl ?? fetch)(`${this.d.base ?? QLOO_BASE}${endpoint}?${qs}`, { headers: { "X-Api-Key": this.d.apiKey, accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
    } catch {
      await this.refund(); // the request never produced an answer
      await this.ledger({ endpoint, key, cached: false, status: "error", ms: now() - t0, note: "network" });
      throw new QlooError("Qloo could not be reached.", "network");
    }
    if (!res.ok) {
      // A 400 carries { errors: [ { message, path } ] } and still costs a monthly unit; 5xx and auth failures carry no usable body.
      const bad = res.status === 400 ? ErrorResp.safeParse(await res.json().catch(() => null)) : null;
      const detail = bad?.success ? bad.data.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join("; ").slice(0, 300) : null;
      await this.ledger({ endpoint, key, cached: false, status: "error", ms: now() - t0, note: `http ${res.status}${detail ? `: ${detail}` : ""}` });
      throw new QlooError(detail ? `Qloo rejected the request: ${detail}` : `Qloo answered ${res.status}.`, detail ? "bad_request" : "http", res.status);
    }
    const raw: unknown = await res.json().catch(() => null);
    const data = parse(raw);
    await this.d.kv?.put(key, JSON.stringify(raw), { expirationTtl: CACHE_TTL_S }).catch(() => undefined);
    await this.ledger({ endpoint, key, cached: false, status: "ok", ms: now() - t0 });
    return done(data, { cached: false, requestId: res.headers.get("x-qloo-request-id") });
  }
}
