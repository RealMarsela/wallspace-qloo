// SAMPLE DATA: invented brand, faces, rates and scores for the demo; replaced by the API in DATA_MODE=app.
// The pre-computed sample plan a judge lands on: "Porchlight Comedy Tour (sample brand)" in Atlanta.
import { Brief, Plan, PlanResponse } from "@/contract";
import { sampleFaces, sampleOwners } from "./faces-sample";
import { sampleHeat } from "./heat-sample";
import { samplePicks } from "./picks-sample";
import { sampleRun } from "./run-sample";

export { sampleFaces, sampleOwners, sampleHeat, samplePicks, sampleRun };

export const sampleBrief: Brief = Brief.parse({
  id: "brief-sample-porchlight",
  brandName: "Porchlight Comedy Tour (sample brand)",
  brandSample: true,
  audienceText: "people who quote 90s sitcoms and go to stand-up shows",
  loves: ["stand-up comedy specials", "90s sitcoms", "southern hip-hop"],
  seeds: [
    { qlooId: "urn:tag:genre:media:stand_up_comedy", name: "Stand-up comedy", type: "urn:tag:genre:media", via: "search", similarity: null },
    { qlooId: "urn:tag:genre:media:comedy_special", name: "Comedy special", type: "urn:tag:genre:media", via: "search", similarity: null },
    { qlooId: "urn:tag:genre:media:sitcom", name: "Sitcom", type: "urn:tag:genre:media", via: "embedding", similarity: 0.82 },
    { qlooId: "urn:tag:keyword:media:1990s", name: "1990s", type: "urn:tag:keyword:media", via: "embedding", similarity: 0.74 },
    { qlooId: "urn:tag:genre:music:southern_hip_hop", name: "Southern hip hop", type: "urn:tag:genre:music", via: "search", similarity: null },
    { qlooId: "urn:tag:genre:place:comedy_club", name: "Comedy club", type: "urn:tag:genre:place", via: "embedding", similarity: 0.71 },
  ],
  city: "atlanta",
  budgetUsd: 40000,
  flightStart: "2026-11-16",
  flightWeeks: 4,
  brandVoice: "warm, a little cheeky, never mean",
  creativeUrl: null,
  createdAt: "2026-10-30T06:11:52.000Z",
});

const faceById = new Map(sampleFaces.map((f) => [f.id, f]));
const spendUsd = samplePicks.reduce((sum, p) => sum + p.costUsd, 0);

const split = samplePicks.map((p) => {
  const face = faceById.get(p.faceId);
  if (!face) throw new Error(`sample pick ${p.faceId} has no face`);
  return { neighbourhood: face.neighbourhood, usd: p.costUsd, share: Math.round((p.costUsd / spendUsd) * 1000) / 1000 };
});

export const samplePlan: Plan = Plan.parse({
  id: "plan-sample-porchlight",
  briefId: sampleBrief.id,
  runId: sampleRun.id,
  status: "ready",
  picks: samplePicks,
  scoredCount: 214,
  droppedCount: 6,
  spendUsd,
  split,
  heat: sampleHeat,
  nemoJobId: null,
  lastRescanAt: "2026-10-30T02:00:00.000Z",
  createdAt: "2026-10-30T06:12:55.000Z",
  sample: true,
});

export const samplePlanResponse = PlanResponse.parse({ plan: samplePlan, brief: sampleBrief, faces: sampleFaces });

// Buckhead faces the plan did not pick; the compare page sets one against a picked face.
export const sampleCompareFaceIds = ["ATL-0106", "ATL-0102", "ATL-0109"] as const;
