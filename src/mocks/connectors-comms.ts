import type { PlanResponse } from "@/contract";
import type { z } from "zod";
import { hmacSha256, toBase64, toHex } from "@/server/connectors/composio/crypto";
import { faces as inventory } from "@/data/faces";

// Mocks for the comms connectors: the Porchlight sample plan bundle, signed Composio and Slack deliveries,
// and fake Composio / Slack / Token Factory fetches. Used by the vitest suites and by local dev.

export type PlanBundle = z.infer<typeof PlanResponse>;

const COPY = [
  "Tonight, someone's getting roasted", "Laugh before the light changes", "Two drinks, no heckling", "Live comedy, five blocks away",
  "Funny people live here", "Your Friday needs a punchline", "Bring someone who laughs loud", "Stand-up at the corner",
];

export function samplePlanBundle(planId = "plan-porchlight-1"): PlanBundle {
  const picked = inventory.filter((f) => f.location === "sample").slice(0, 8);
  const hoods = [...new Set(picked.map((f) => f.neighbourhood))];
  const costUsd = 4950;
  return {
    plan: {
      id: planId, briefId: "brief-porchlight", runId: "run-porchlight", status: "ready",
      picks: picked.map((f, i) => ({
        faceId: f.id, rank: i + 1, affinity: 0.8 - i * 0.03, score: 0.9 - i * 0.04, costUsd,
        topTags: ["live comedy"], evidence: [], photoRead: null, events: [],
        copy: [
          { text: COPY[i], rationale: "sample", guard: { status: "pass", engine: "live-guard", reasons: [], suggestion: null }, nemo: null },
        ],
        chosenCopy: 0, review: { status: "ok", note: null }, tasteShifted: false,
      })),
      scoredCount: 86, droppedCount: 4, spendUsd: costUsd * picked.length,
      split: hoods.map((h) => {
        const n = picked.filter((f) => f.neighbourhood === h).length;
        return { neighbourhood: h, usd: n * costUsd, share: n / picked.length };
      }),
      heat: [], nemoJobId: null, lastRescanAt: null, createdAt: "2026-10-30T07:00:00.000Z", sample: true,
    },
    brief: {
      id: "brief-porchlight", brandName: "Porchlight Comedy Tour", brandSample: true,
      audienceText: "people who love live comedy", loves: ["stand-up comedy specials"], seeds: [], city: "atlanta",
      budgetUsd: 40000, flightStart: "2026-11-16", flightWeeks: 8, brandVoice: null, creativeUrl: null, createdAt: "2026-10-30T06:00:00.000Z",
    },
    faces: picked,
  };
}

// A Composio webhook delivery signed the way Composio signs it.
export async function signedComposioDelivery(secret: string, body: unknown, opts: { id?: string; ts?: number } = {}) {
  const raw = JSON.stringify(body);
  const id = opts.id ?? `msg_${Math.random().toString(36).slice(2, 10)}`;
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = toBase64(await hmacSha256(secret, `${id}.${ts}.${raw}`));
  return new Request("https://wallspace.pages.dev/api/connectors/composio/webhook", {
    method: "POST", body: raw,
    headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` },
  });
}

// A Slack interactivity POST signed the way Slack signs it.
export async function signedSlackInteraction(secret: string, payload: unknown, opts: { ts?: number; badSig?: boolean } = {}) {
  const raw = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = opts.badSig ? "v0=deadbeef" : `v0=${toHex(await hmacSha256(secret, `v0:${ts}:${raw}`))}`;
  return new Request("https://wallspace.pages.dev/api/connectors/slack/interact", {
    method: "POST", body: raw,
    headers: { "content-type": "application/x-www-form-urlencoded", "x-slack-request-timestamp": ts, "x-slack-signature": sig },
  });
}

export interface Call {
  url: string;
  method: string;
  body: unknown;
}

const jsonRes = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

// Fake Composio REST: configurable auth configs, connected accounts and tool responses. Records every call.
export function fakeComposio(opts: {
  authConfigs?: { id: string; name: string }[];
  accounts?: { id: string; toolkit: string; status?: string; userId?: string }[];
  tools?: Record<string, unknown>;
  toolSuccessful?: boolean;
} = {}) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: url.pathname + url.search, method, body });
    const path = url.pathname.replace("/api/v3.1", "");
    if (method === "GET" && path === "/auth_configs") return jsonRes({ items: opts.authConfigs ?? [], next_cursor: null });
    if (method === "POST" && path === "/auth_configs") return jsonRes({ auth_config: { id: "ac_new", name: body.auth_config.name } }, 201);
    if (method === "POST" && path === "/connected_accounts/link") return jsonRes({ redirect_url: "https://connect.composio.dev/link/lk_demo", connected_account_id: "ca_pending", expires_at: "2026-10-30T09:00:00Z" }, 201);
    if (method === "GET" && path === "/connected_accounts") {
      return jsonRes({ items: (opts.accounts ?? []).map((a) => ({ id: a.id, status: a.status ?? "ACTIVE", user_id: a.userId ?? "wallspace-demo", toolkit: { slug: a.toolkit }, auth_config: { id: "ac_x" }, data: { displayName: "demo@example.com", token: "SHOULD-NOT-LEAK" }, updated_at: "2026-10-30T07:00:00Z" })) });
    }
    if (method === "DELETE" && path.startsWith("/connected_accounts/")) return jsonRes({ success: true });
    if (method === "POST" && path.startsWith("/tools/execute/")) {
      const slug = decodeURIComponent(path.split("/").pop() ?? "");
      return jsonRes({ data: opts.tools?.[slug] ?? {}, error: opts.toolSuccessful === false ? "boom" : null, successful: opts.toolSuccessful !== false, log_id: "log_1" });
    }
    return jsonRes({ error: { message: `unmocked ${method} ${path}`, slug: "unmocked", status: 404 } }, 404);
  };
  return { fetchImpl, calls };
}

// Fake Token Factory chat endpoint returning `content` as the model message.
export function fakeTokenFactory(content: string) {
  const fetchImpl: typeof fetch = async () => jsonRes({ id: "chat_1", choices: [{ finish_reason: "stop", message: { content } }], usage: { prompt_tokens: 120, completion_tokens: 30 } });
  return fetchImpl;
}

// Fake Slack Web API: records calls, answers ok with a message ts.
export function fakeSlack() {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith("chat.postMessage")) return jsonRes({ ok: true, channel: "C0APPROVALS", ts: "1761800000.000100" });
    return jsonRes({ ok: true, ts: "1761800000.000100", team: "Wallspace Demo" });
  };
  return { fetchImpl, calls };
}

// Audience card bundle for a face, as B1's GET /api/owner/faces/:id/card returns it.
export function sampleAudienceCard(faceId: string) {
  const face = inventory.find((f) => f.id === faceId) ?? inventory[0];
  return {
    face,
    card: {
      faceId: face.id,
      topTags: [{ name: "live comedy", score: 0.82 }, { name: "craft breweries", score: 0.74 }, { name: "indie film", score: 0.61 }],
      brands: [{ name: "Porchlight Comedy Tour (sample brand)", qlooId: "urn:entity:brand:sample-1", score: 0.88 }, { name: "Little Five Records", qlooId: "urn:entity:brand:sample-2", score: 0.7 }],
      generatedAt: "2026-10-30T07:30:00.000Z",
    },
  };
}
