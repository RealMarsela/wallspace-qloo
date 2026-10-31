import { z } from "zod";
import {
  ApiError,
  ConnectionsResponse,
  CreateBriefRequest,
  CreateBriefResponse,
  FacesResponse,
  GuardResponse,
  PlanResponse,
  PlansResponse,
  RunResponse,
  RunStep,
  SendPlanRequest,
  SendPlanResponse,
  SignOffResponse,
  StartPlanResponse,
} from "@/contract";
import { mockApi } from "./mock-api";

// Typed client for the Wallspace HTTP contract (src/contract/api.ts). Every response is zod-parsed.
// NEXT_PUBLIC_DATA_MODE=app talks to /api; anything else serves the labelled sample data in src/mocks.

export type PlanData = z.infer<typeof PlanResponse>;
export type PlansData = z.infer<typeof PlansResponse>;
export type RunData = z.infer<typeof RunResponse>;
export type FacesData = z.infer<typeof FacesResponse>;
export type Guard = z.infer<typeof GuardResponse>;
export type BriefInput = z.infer<typeof CreateBriefRequest>;
export type BriefCreated = z.infer<typeof CreateBriefResponse>;
export type PlanStarted = z.infer<typeof StartPlanResponse>;
export type SignedOff = z.infer<typeof SignOffResponse>;
export type ConnectionsData = z.infer<typeof ConnectionsResponse>;
export type SendInput = z.infer<typeof SendPlanRequest>;
export type Sent = z.infer<typeof SendPlanResponse>;

export class ApiFailure extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiFailure";
  }
}

export interface LiveHandlers {
  onStep: (step: RunStep) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export interface WallspaceApi {
  mode: "mock" | "app";
  samplePlanId(): Promise<string>;
  plan(id: string): Promise<PlanData>;
  plans(): Promise<PlansData>;
  run(id: string): Promise<RunData>;
  faces(): Promise<FacesData>;
  guard(text: string, signal?: AbortSignal, loves?: string[]): Promise<Guard>;
  createBrief(input: BriefInput): Promise<BriefCreated>;
  startPlan(briefId: string): Promise<PlanStarted>;
  signOff(planId: string): Promise<SignedOff>;
  connections(): Promise<ConnectionsData>;
  sendPlan(planId: string, input: SendInput): Promise<Sent>;
  exportCsv(planId: string): Promise<Blob>;
  /** Streams run steps. Returns a stop function. */
  live(runId: string, handlers: LiveHandlers): () => void;
}

async function request<S extends z.ZodType>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiFailure("Network unreachable. Check your connection and try again.", 0, "network");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiError.safeParse(body);
    throw new ApiFailure(parsed.success ? parsed.data.error : `Request failed (${res.status})`, res.status, parsed.success ? parsed.data.code : undefined);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiFailure("The server sent data this page does not understand.", res.status, "contract");
  return parsed.data;
}

const enc = encodeURIComponent;

const realApi: WallspaceApi = {
  mode: "app",
  async samplePlanId() {
    const { plans } = await this.plans();
    const sample = plans.find((p) => p.sample) ?? plans[0];
    if (!sample) throw new ApiFailure("No plans yet. Start one from New brief.", 404, "empty");
    return sample.id;
  },
  plan: (id) => request(`/api/plans/${enc(id)}`, PlanResponse),
  plans: () => request("/api/plans", PlansResponse),
  run: (id) => request(`/api/runs/${enc(id)}`, RunResponse),
  faces: () => request("/api/faces", FacesResponse),
  guard: (text, signal, loves) => request("/api/guard", GuardResponse, { method: "POST", body: JSON.stringify({ text, loves }), signal }),
  createBrief: (input) => request("/api/briefs", CreateBriefResponse, { method: "POST", body: JSON.stringify(input) }),
  startPlan: (briefId) => request("/api/plans", StartPlanResponse, { method: "POST", body: JSON.stringify({ briefId }) }),
  signOff: (planId) => request(`/api/plans/${enc(planId)}/sign-off`, SignOffResponse, { method: "POST" }),
  connections: () => request("/api/connections", ConnectionsResponse),
  sendPlan: (planId, input) =>
    request(`/api/plans/${enc(planId)}/send`, SendPlanResponse, { method: "POST", body: JSON.stringify(input) }),
  async exportCsv(planId) {
    const res = await fetch(`/api/plans/${enc(planId)}/export.csv`);
    if (!res.ok) throw new ApiFailure(`Export failed (${res.status})`, res.status);
    return res.blob();
  },
  live(runId, handlers) {
    return openLive(runId, handlers, (id) => realApi.run(id));
  },
};

// WebSocket to the run's Durable Object; falls back to polling GET /api/runs/:id if the socket fails.
function openLive(runId: string, h: LiveHandlers, fetchRun: (id: string) => Promise<RunData>): () => void {
  let stopped = false;
  let ws: WebSocket | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;
  const seen = new Set<string>();
  const emit = (s: RunStep) => {
    if (seen.has(s.id)) return;
    seen.add(s.id);
    h.onStep(s);
  };
  const sync = async () => {
    try {
      const { run } = await fetchRun(runId);
      if (stopped) return;
      run.steps.forEach(emit);
      if (run.status !== "running") {
        stop();
        if (run.status === "failed") h.onError("The run stopped with an error.");
        else h.onDone();
      }
    } catch (err) {
      if (stopped) return;
      if (err instanceof ApiFailure && err.status === 404) stop();
      h.onError(err instanceof Error ? err.message : "Could not load the run.");
    }
  };
  const startPolling = () => {
    if (poll || stopped) return;
    poll = setInterval(sync, 2000);
  };
  function stop() {
    stopped = true;
    if (poll) clearInterval(poll);
    ws?.close();
  }
  void sync();
  try {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/api/runs/${enc(runId)}/live`);
    ws.onmessage = (ev) => {
      let data: unknown;
      try {
        data = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const step = RunStep.safeParse(data);
      if (step.success) emit(step.data);
      else void sync();
    };
    ws.onerror = startPolling;
    ws.onclose = () => {
      if (!stopped) void sync().then(startPolling);
    };
  } catch {
    startPolling();
  }
  return stop;
}

// A production build never reads src/mocks: sample data is for `next dev` and unit tests only.
export const api: WallspaceApi = process.env.NEXT_PUBLIC_DATA_MODE === "app" || process.env.NODE_ENV === "production" ? realApi : mockApi;
