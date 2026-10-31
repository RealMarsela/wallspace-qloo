import {
  ConnectionsResponse,
  CreateBriefResponse,
  FacesResponse,
  GuardResponse,
  PlanResponse,
  PlansResponse,
  RunResponse,
  SendPlanResponse,
  SignOffResponse,
  type Connection,
  type GuardVerdict,
} from "@/contract";
import { sampleFaces, sampleOwners } from "@/mocks/faces-sample";
import { sampleBrief, samplePlan, samplePlanResponse } from "@/mocks/plan-sample";
import { sampleRun } from "@/mocks/run-sample";
import { planToCsv } from "./plan-csv";
import type { WallspaceApi } from "./api-client";

// DATA_MODE=mock: serves the labelled sample plan from src/mocks with realistic latency. Development only;
// production runs with NEXT_PUBLIC_DATA_MODE=app against the real API.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class MockMiss extends Error {
  readonly status = 404;
  readonly code = "not_found";
}

const IDENTITY = [
  /\b(black|white|hispanic|latin[oax]|asian|arab|african[- ]american|caucasian|indigenous)\b/i,
  /\b(jewish|muslim|christian|catholic|hindu|sikh|buddhist|mormon)\b/i,
  /\b(gay|lesbian|bisexual|queer|trans(gender)?|straight)\b/i,
  /\b(men|women|male|female|moms|dads|girls|boys)\b/i,
  /\b\d{2}\s*(to|-|–)\s*\d{2}\b|\b(under|over)\s+\d{2}\b|\byear[- ]olds?\b/i,
  /\b(immigrants?|disabled|pregnant|low[- ]income|poor|rich|religious)\b/i,
];

export function mockGuard(text: string): GuardVerdict {
  const hits = IDENTITY.filter((re) => re.test(text));
  if (hits.length === 0) return { status: "pass", engine: "live-guard", reasons: [], suggestion: null };
  return GuardResponse.parse({
    status: "blocked",
    engine: "live-guard",
    reasons: ["Describes people by who they are (race, religion, gender, age or similar), not by what they love."],
    suggestion: "Fans of stand-up comedy specials and southern hip-hop",
  });
}

const mockConnections: Connection[] = [
  { provider: "gmail", category: "mail", name: "Gmail", status: "connected", account: "planner@sample.agency", realtime: "trigger", lastSyncAt: "2026-10-30T06:10:00Z", events: [] },
  { provider: "slack", category: "chat", name: "Slack", status: "connected", account: "#media-approvals (sample)", realtime: "webhook", lastSyncAt: "2026-10-30T06:12:00Z", events: [] },
  { provider: "hubspot", category: "crm", name: "HubSpot", status: "not-connected", account: null, realtime: "webhook", lastSyncAt: null, events: [] },
  { provider: "google-sheets", category: "docs", name: "Google Sheets", status: "connected", account: "Sample Agency Drive", realtime: "poll", lastSyncAt: "2026-10-30T05:58:00Z", events: [] },
  { provider: "google-calendar", category: "calendar", name: "Google Calendar", status: "not-connected", account: null, realtime: "none", lastSyncAt: null, events: [] },
];

export const mockApi: WallspaceApi = {
  mode: "mock",
  async samplePlanId() {
    return samplePlan.id;
  },
  async plan(id) {
    await wait(260);
    if (id !== samplePlan.id) throw new MockMiss("No plan with that id in the sample data.");
    return PlanResponse.parse(samplePlanResponse);
  },
  async plans() {
    await wait(120);
    const { id, briefId, status, spendUsd, createdAt, sample } = samplePlan;
    return PlansResponse.parse({ plans: [{ id, briefId, status, spendUsd, createdAt, sample }] });
  },
  async run(id) {
    await wait(200);
    if (id !== sampleRun.id) throw new MockMiss("No run with that id in the sample data.");
    return RunResponse.parse({ run: sampleRun });
  },
  async faces() {
    await wait(180);
    return FacesResponse.parse({ faces: sampleFaces, owners: sampleOwners });
  },
  async guard(text) {
    await wait(140 + Math.min(text.length, 300));
    return mockGuard(text);
  },
  async createBrief(input) {
    await wait(300);
    const guard = mockGuard(`${input.audienceText} ${input.loves.join(" ")}`);
    return CreateBriefResponse.parse({
      brief: { ...sampleBrief, ...input, creativeUrl: input.creativeUrl ?? null, id: sampleBrief.id, createdAt: new Date().toISOString() },
      guard,
    });
  },
  async startPlan() {
    await wait(240);
    return { planId: samplePlan.id, runId: sampleRun.id };
  },
  async signOff() {
    await wait(500);
    const lines = samplePlan.picks.reduce((n, p) => n + p.copy.length, 0);
    return SignOffResponse.parse({ plan: { ...samplePlan, status: "awaiting-nemo" }, queuedLines: lines });
  },
  async connections() {
    await wait(160);
    return ConnectionsResponse.parse({ connections: mockConnections });
  },
  async sendPlan(_planId, input) {
    await wait(700);
    return SendPlanResponse.parse({ ok: true, provider: input.provider, externalId: "sample-msg-0001", url: null });
  },
  async exportCsv() {
    return new Blob([planToCsv(samplePlanResponse)], { type: "text/csv" });
  },
  live(_runId, h) {
    // Replays the sample run at its recorded pace (each gap capped so the replay lasts about half a minute).
    let i = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const next = () => {
      if (i >= sampleRun.steps.length) return h.onDone();
      const step = sampleRun.steps[i++];
      h.onStep(step);
      timer = setTimeout(next, Math.min(step.ms, 1600) + 220);
    };
    timer = setTimeout(next, 500);
    return () => {
      if (timer) clearTimeout(timer);
    };
  },
};
