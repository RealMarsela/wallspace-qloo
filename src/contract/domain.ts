import { z } from "zod";

// Wallspace domain contract. Every API response and every mock parses against these schemas.
// Trade words on purpose: face, read side, lit, flight, showing.

export const Provenance = z.enum(["real", "sample"]);

export const FaceKind = z.enum(["bulletin", "poster", "digital_bulletin", "bus_shelter", "kiosk"]);

export const Face = z.object({
  id: z.string(), // "ATL-0412"
  name: z.string(), // "Moreland Ave at Euclid"
  kind: FaceKind,
  lat: z.number(),
  lng: z.number(),
  neighbourhood: z.string(), // City of Atlanta neighbourhood name
  readSide: z.enum(["left", "right"]),
  facing: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
  widthFt: z.number(),
  heightFt: z.number(),
  lit: z.boolean(),
  digital: z.boolean(),
  rateMonthUsd: z.number(), // always sample in the hackathon build
  ownerId: z.string(), // media owner
  photoUrl: z.string().nullable(), // Wikimedia Commons or R2
  photoCredit: z.string().nullable(),
  location: Provenance, // "real" = OpenStreetMap position, "sample" = added face
  osmId: z.string().nullable(),
});
export type Face = z.infer<typeof Face>;

export const MediaOwner = z.object({ id: z.string(), name: z.string(), sample: z.boolean() });
export type MediaOwner = z.infer<typeof MediaOwner>;

// A Qloo entity or tag the brief resolved to.
export const Seed = z.object({
  qlooId: z.string(),
  name: z.string(),
  type: z.string(), // urn:entity:artist, urn:tag:genre:..., urn:audience:...
  via: z.enum(["search", "audience", "embedding", "user"]),
  similarity: z.number().nullable(), // cosine score when via=embedding
});
export type Seed = z.infer<typeof Seed>;

export const Brief = z.object({
  id: z.string(),
  brandName: z.string(),
  brandSample: z.boolean(), // fictional brand in demo and video
  audienceText: z.string(), // what the planner typed
  loves: z.array(z.string()), // "stand-up comedy specials", ...
  seeds: z.array(Seed),
  city: z.literal("atlanta"),
  budgetUsd: z.number().positive(),
  flightStart: z.string(), // ISO date
  flightWeeks: z.number().int().min(1).max(52),
  brandVoice: z.string().nullable(),
  creativeUrl: z.string().nullable(), // current billboard image (R2)
  createdAt: z.string(),
});
export type Brief = z.infer<typeof Brief>;

// Taste-only guard. Live = our in-Worker code applying the NeMo policy; nemo = the Nebius job result.
export const GuardVerdict = z.object({
  status: z.enum(["pass", "blocked", "rewritten"]),
  engine: z.enum(["live-guard", "nemo-guardrails"]),
  reasons: z.array(z.string()),
  suggestion: z.string().nullable(), // taste-based rewrite offered to the planner
});
export type GuardVerdict = z.infer<typeof GuardVerdict>;

export const HeatCell = z.object({ geohash: z.string(), lat: z.number(), lng: z.number(), affinity: z.number().min(0).max(1) });
export type HeatCell = z.infer<typeof HeatCell>;

export const Evidence = z.object({
  kind: z.enum(["qloo-heatmap", "qloo-tag", "qloo-brand", "qloo-demographics", "photo-read", "tavily-event"]),
  label: z.string(), // "over-indexes on live comedy"
  value: z.number().nullable(),
  sourceRef: z.string(), // run step id that produced it
});
export type Evidence = z.infer<typeof Evidence>;

export const PhotoRead = z.object({
  sightline: z.enum(["clear", "partial", "blocked"]),
  clutter: z.enum(["low", "medium", "high"]),
  faceShareOfFrame: z.number().min(0).max(1),
  note: z.string(),
});

export const LocalEvent = z.object({ title: z.string(), date: z.string(), distanceM: z.number().nullable(), url: z.string() });

export const CopyLine = z.object({
  text: z.string(), // 7 words max
  rationale: z.string(),
  guard: GuardVerdict,
  nemo: GuardVerdict.nullable(), // set after the NeMo sign-off job reports back
});
export type CopyLine = z.infer<typeof CopyLine>;

export const Pick = z.object({
  faceId: z.string(),
  rank: z.number().int(),
  affinity: z.number(),
  score: z.number(),
  costUsd: z.number(),
  topTags: z.array(z.string()), // what this block over-indexes on
  evidence: z.array(Evidence),
  photoRead: PhotoRead.nullable(),
  events: z.array(LocalEvent),
  copy: z.array(CopyLine), // three lines
  chosenCopy: z.number().int().min(0),
  review: z.object({ status: z.enum(["ok", "flagged", "redrafted"]), note: z.string().nullable() }),
  tasteShifted: z.boolean(), // set by the nightly re-scan
});
export type Pick = z.infer<typeof Pick>;

export const PlanStatus = z.enum(["running", "ready", "awaiting-nemo", "nemo-checked", "failed"]);

export const Plan = z.object({
  id: z.string(),
  briefId: z.string(),
  runId: z.string(),
  status: PlanStatus,
  picks: z.array(Pick),
  scoredCount: z.number().int(), // faces scored in total
  droppedCount: z.number().int(), // faces dropped (evidence or photo)
  spendUsd: z.number(),
  split: z.array(z.object({ neighbourhood: z.string(), usd: z.number(), share: z.number() })),
  heat: z.array(HeatCell),
  nemoJobId: z.string().nullable(),
  lastRescanAt: z.string().nullable(),
  createdAt: z.string(),
  sample: z.boolean(), // the pre-computed demo plan
});
export type Plan = z.infer<typeof Plan>;

export const ModelRole = z.enum(["super-vl", "lightning", "ultra", "embedding", "live-guard", "tavily", "qloo", "nemo"]);

export const RunStep = z.object({
  id: z.string(),
  at: z.string(),
  role: ModelRole,
  model: z.string().nullable(), // exact model id, e.g. nvidia/Nemotron-3.5-Super-VL
  title: z.string(), // "map the audience over Atlanta"
  tool: z.string().nullable(), // "qloo.insights urn:heatmap"
  summary: z.string(),
  ms: z.number(),
  tokensIn: z.number().nullable(),
  tokensOut: z.number().nullable(),
  costUsd: z.number().nullable(),
  requestId: z.string().nullable(), // provider request id, for the Nebius feedback field
  cached: z.boolean(),
  status: z.enum(["ok", "error", "skipped"]),
  errorCode: z.string().nullish(), // set on a skipped or failed step: "model_unavailable", a Qloo or Tavily code
});
export type RunStep = z.infer<typeof RunStep>;

export const Run = z.object({
  id: z.string(),
  planId: z.string(),
  kind: z.enum(["plan", "rescan", "eval"]),
  status: z.enum(["running", "done", "failed"]),
  steps: z.array(RunStep),
  costUsd: z.number(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
export type Run = z.infer<typeof Run>;

// Media-owner mode: who lives around a face and which brands to pitch it to.
export const AudienceCard = z.object({
  faceId: z.string(),
  // score is 0..1. lift (optional): how many times higher the tag ranks around this face than across the city (Qloo rank vs the city
  // list); absent when the Atlanta baseline call failed. Taste only: identity-style tags never appear here.
  topTags: z.array(z.object({ name: z.string(), score: z.number(), lift: z.number().nullish() })),
  brands: z.array(z.object({ name: z.string(), qlooId: z.string(), score: z.number() })),
  generatedAt: z.string(),
});
export type AudienceCard = z.infer<typeof AudienceCard>;

export const ApiError = z.object({ error: z.string(), code: z.string().optional() });

// Customer-tool connections (mail, chat, CRM, docs, calendar). Connector lanes add provider-specific contracts beside this.
export const Connection = z.object({
  provider: z.string(), // "gmail", "outlook", "slack", "hubspot", "google-sheets", "notion", "google-calendar", ...
  category: z.enum(["mail", "chat", "crm", "docs", "calendar", "ooh"]),
  name: z.string(),
  status: z.enum(["connected", "not-connected", "error"]),
  account: z.string().nullable(), // connected account label, never a token
  realtime: z.enum(["webhook", "trigger", "poll", "none"]),
  lastSyncAt: z.string().nullable(),
  events: z.array(z.object({ at: z.string(), direction: z.enum(["out", "in"]), summary: z.string() })),
});
export type Connection = z.infer<typeof Connection>;
