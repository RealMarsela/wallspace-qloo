import { z } from "zod";
import { AudienceCard, Brief, Connection, Face, GuardVerdict, MediaOwner, Plan, Run } from "./domain";

// HTTP contract. Every route validates its input with these schemas and returns { error, code? } on failure.
// Connector routes live in ./connectors-*.ts, owned by the connector lanes.

export const routes = {
  faces: "GET /api/faces", // ?neighbourhood= — all faces + owners
  face: "GET /api/faces/:id",
  guard: "POST /api/guard", // live taste-only guard on brief text, < 1 s
  createBrief: "POST /api/briefs",
  startPlan: "POST /api/plans", // starts the plan Workflow, returns ids at once
  plan: "GET /api/plans/:id",
  plans: "GET /api/plans",
  run: "GET /api/runs/:id",
  runLive: "GET /api/runs/:id/live", // WebSocket upgrade to the run's Durable Object; messages are RunStep JSON
  signOff: "POST /api/plans/:id/sign-off", // live guard now, queues the plan for the NeMo job
  exportCsv: "GET /api/plans/:id/export.csv",
  rescan: "POST /api/plans/:id/rescan", // "Run now" for the nightly re-scan Workflow
  audienceCard: "GET /api/owner/faces/:id/card",
  nemoQueue: "GET /api/ingest/nemo", // Bearer INGEST_SECRET; lines waiting for NeMo
  nemoIngest: "POST /api/ingest/nemo", // Bearer INGEST_SECRET; NeMo job results
  limits: "GET /api/limits",
  connections: "GET /api/connections",
  connect: "POST /api/connections/:provider/connect", // returns { redirectUrl } for OAuth / Composio link
  disconnect: "POST /api/connections/:provider/disconnect",
  sendPitch: "POST /api/owner/faces/:id/pitch", // { provider, to, note } media-owner pitch sheet; response = SendPlanResponse
  sendPlan: "POST /api/plans/:id/send", // { provider, to } mail, Slack approval, CRM record, doc export, calendar
} as const;

export const FacesResponse = z.object({ faces: z.array(Face), owners: z.array(MediaOwner) });

export const GuardRequest = z.object({ text: z.string().min(1).max(2000), loves: z.array(z.string().max(80)).max(20).optional() });
export const GuardResponse = GuardVerdict;

export const CreateBriefRequest = Brief.pick({
  brandName: true, audienceText: true, loves: true, budgetUsd: true, flightStart: true, flightWeeks: true, brandVoice: true,
}).extend({ creativeUrl: z.string().nullable().optional() });
export const CreateBriefResponse = z.object({ brief: Brief, guard: GuardVerdict });

export const StartPlanRequest = z.object({ briefId: z.string() });
export const StartPlanResponse = z.object({ planId: z.string(), runId: z.string() });

export const PlanResponse = z.object({ plan: Plan, brief: Brief, faces: z.array(Face) });
export const PlansResponse = z.object({ plans: z.array(Plan.pick({ id: true, briefId: true, status: true, spendUsd: true, createdAt: true, sample: true })) });
export const RunResponse = z.object({ run: Run });

export const SignOffResponse = z.object({ plan: Plan, queuedLines: z.number().int() });
export const AudienceCardResponse = z.object({ card: AudienceCard, face: Face });

export const NemoQueueResponse = z.object({
  items: z.array(z.object({ planId: z.string(), faceId: z.string().nullable(), lineIndex: z.number().int().nullable(), text: z.string() })),
});
export const NemoIngestRequest = z.object({
  jobId: z.string(),
  mode: z.enum(["sign-off", "red-team"]),
  results: z.array(z.object({
    planId: z.string().nullable(), faceId: z.string().nullable(), lineIndex: z.number().int().nullable(),
    text: z.string(), verdict: GuardVerdict,
  })),
  stats: z.object({ checked: z.number().int(), blocked: z.number().int(), falsePositives: z.number().int().nullable() }),
});

export const LimitsResponse = z.object({
  updatedAt: z.string(),
  plans: z.number().int(),
  costPerPlanUsd: z.number(),
  facesDroppedForEvidence: z.number(),
  guard: z.object({ live: z.object({ blocked: z.number(), falsePositives: z.number().nullable() }), nemo: z.object({ catchRate: z.number().nullable(), falsePositiveRate: z.number().nullable(), jobId: z.string().nullable() }) }),
  qlooCoverageGaps: z.array(z.string()),
  notes: z.array(z.string()),
});

export const ConnectionsResponse = z.object({ connections: z.array(Connection) });
export const ConnectResponse = z.object({ redirectUrl: z.string().url() });
export const SendPlanRequest = z.object({ provider: z.string(), to: z.string().nullable().optional(), note: z.string().max(2000).nullable().optional() });
export const SendPlanResponse = z.object({ ok: z.literal(true), provider: z.string(), externalId: z.string().nullable(), url: z.string().nullable() });
export const SendPitchRequest = SendPlanRequest;
export const SendPitchResponse = SendPlanResponse;

// --- Accounts, workspaces and onboarding (lane B5, appended; the schemas live in ./auth.ts) ---
// Writes need a session and act inside the caller's workspace; reading another workspace's resource answers 404.
export const authRoutes = {
  signUp: "POST /api/auth/sign-up/email", // { name, email, password }; sets the session cookie
  signIn: "POST /api/auth/sign-in/email", // { email, password }
  signInGoogle: "POST /api/auth/sign-in/social", // { provider: "google" }; only when MeResponse.providers.google
  signOut: "POST /api/auth/sign-out",
  me: "GET /api/me", // signed out answers 200 with user: null
  createWorkspace: "POST /api/workspaces",
  workspace: "GET /api/workspaces",
  onboarding: "GET /api/onboarding",
  patchOnboarding: "PATCH /api/onboarding",
  briefs: "GET /api/briefs", // the caller's own briefs
} as const;
