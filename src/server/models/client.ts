import type { RunStep } from "@/contract";
import { MODELS, costUsd, reasoningFields, type TfRole } from "./roles";
import { requestKey } from "./replay";
import { MODEL_UNAVAILABLE, TfError, type ChatOptions, type ChatResult, type RecordedResponse, type ReplayStore, type TfEnv, type TfMode, type ToolCall } from "./types";

const DEFAULT_BASE = "https://api.tokenfactory.nebius.com/v1/";

export interface TfClientOptions {
  apiKey?: string;
  mode?: TfMode;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  store?: ReplayStore;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function tfOptionsFromEnv(env: TfEnv, extra: Partial<TfClientOptions> = {}): TfClientOptions {
  return { apiKey: env.NEBIUS_API_KEY, mode: env.TF_MODE === "replay" ? "replay" : "live", baseUrl: env.TF_BASE_URL, ...extra };
}

interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
}

interface RawChat {
  id?: string;
  choices?: { finish_reason?: string | null; message?: { content?: string | null; tool_calls?: ToolCall[] | null } }[];
  usage?: RawUsage;
}

export class TokenFactory {
  readonly mode: TfMode;
  private readonly opts: TfClientOptions;
  private seq = 0;

  constructor(opts: TfClientOptions) {
    this.opts = opts;
    this.mode = opts.mode ?? "live";
  }

  private now() {
    return (this.opts.now ?? Date.now)();
  }

  private stepId(role: string) {
    this.seq += 1;
    return `${role}-${this.now().toString(36)}-${this.seq}`;
  }

  // One POST with a single retry on 429/5xx/network errors. Returns the parsed body and the provider request id.
  private async post(path: string, body: unknown): Promise<RecordedResponse & { cached: boolean }> {
    const key = await requestKey(path, body);
    if (this.mode === "replay") {
      const hit = await this.opts.store?.get(key);
      if (!hit) throw new TfError(`no recorded response for ${path} (${key})`, "replay_miss");
      return { ...hit, cached: true };
    }
    if (!this.opts.apiKey) throw new TfError("NEBIUS_API_KEY is not set", "no_key");
    const url = new URL(path, this.opts.baseUrl ?? DEFAULT_BASE).toString();
    const doFetch = this.opts.fetchImpl ?? fetch;
    let lastErr: TfError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = this.now();
      try {
        const res = await doFetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const ms = this.now() - t0;
        const requestId = res.headers.get("x-request-id") ?? res.headers.get("x-inference-id");
        const parsed: unknown = await res.json().catch(() => null);
        if (res.ok) {
          const rec = { status: res.status, body: parsed, requestId, ms };
          await this.opts.store?.put?.(key, rec);
          return { ...rec, cached: false };
        }
        const gone = res.status === 404 || /model_not_found|model_not_available/i.test(JSON.stringify((parsed as { error?: unknown } | null)?.error ?? "").slice(0, 400));
        lastErr = new TfError(`Token Factory ${res.status}`, gone ? MODEL_UNAVAILABLE : res.status === 429 ? "rate_limited" : "upstream", res.status);
        if (res.status !== 429 && res.status < 500) throw lastErr;
        const wait = Number(res.headers.get("retry-after")) * 1000 || 800;
        await (this.opts.sleep ?? ((n) => new Promise((r) => setTimeout(r, n))))(Math.min(wait, 4000));
      } catch (e) {
        if (e instanceof TfError && (e.status ?? 0) < 500 && e.status !== 429) throw e;
        lastErr = e instanceof TfError ? e : new TfError("Token Factory unreachable", "network");
      }
    }
    throw lastErr ?? new TfError("Token Factory failed", "upstream");
  }

  private baseStep(role: TfRole, meta: ChatOptions["meta"], rec: RecordedResponse & { cached: boolean }, usage: RawUsage | undefined): RunStep {
    const m = MODELS[role];
    const prompt = usage?.prompt_tokens ?? 0;
    const cachedTok = usage?.prompt_cache_hit_tokens ?? usage?.prompt_tokens_details?.cached_tokens ?? 0;
    const out = usage?.completion_tokens ?? 0;
    return {
      id: this.stepId(m.stepRole),
      at: new Date(this.now()).toISOString(),
      role: m.stepRole,
      model: m.id,
      title: meta.title,
      tool: meta.tool ?? null,
      summary: meta.summary ?? "",
      ms: rec.ms,
      tokensIn: prompt,
      tokensOut: out,
      costUsd: costUsd(role, prompt, cachedTok, out),
      requestId: rec.requestId,
      cached: rec.cached,
      status: "ok",
    };
  }

  async chat(o: ChatOptions): Promise<ChatResult> {
    const model = MODELS[o.role].id;
    const body: Record<string, unknown> = {
      model,
      messages: o.messages,
      max_tokens: o.maxTokens ?? 800,
      temperature: o.temperature ?? 0.2,
      ...reasoningFields(o.reasoning ?? (o.role === "ultra" ? "default" : "off")),
    };
    if (o.tools?.length) {
      body.tools = o.tools;
      body.tool_choice = o.toolChoice ?? "auto";
    }
    if (o.jsonSchema) {
      body.response_format = { type: "json_schema", json_schema: { name: o.jsonSchema.name, strict: true, schema: o.jsonSchema.schema } };
    }
    const rec = await this.post("chat/completions", body);
    const raw = rec.body as RawChat | null;
    const choice = raw?.choices?.[0];
    if (!choice?.message) throw new TfError("Token Factory returned no message", "bad_response");
    return {
      content: choice.message.content ?? "",
      toolCalls: choice.message.tool_calls ?? [],
      finishReason: choice.finish_reason ?? null,
      step: this.baseStep(o.role, o.meta, rec, raw?.usage),
    };
  }

  // dimensions: Qwen3-Embedding accepts a shorter vector (512 measured); the default 4096 is only needed for archival use.
  async embed(texts: string[], meta: ChatOptions["meta"], dimensions = 512): Promise<{ vectors: number[][]; step: RunStep }> {
    const rec = await this.post("embeddings", { model: MODELS.embed.id, input: texts, dimensions });
    const raw = rec.body as { data?: { index: number; embedding: number[] }[]; usage?: RawUsage } | null;
    const rows = raw?.data;
    if (!rows || rows.length !== texts.length) throw new TfError("Token Factory returned the wrong embedding count", "bad_response");
    const vectors = [...rows].sort((a, b) => a.index - b.index).map((r) => r.embedding);
    return { vectors, step: this.baseStep("embed", meta, rec, raw?.usage) };
  }
}
