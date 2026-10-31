// SAMPLE DATA: invented brand, faces, rates and scores for the demo; replaced by the API in DATA_MODE=app.
// The recorded agent run behind the sample plan: which model did what, with times, tokens and cost.
import { Run, type RunStep } from "@/contract";

type Role = RunStep["role"];

const MODEL: Partial<Record<Role, string>> = {
  "super-vl": "nvidia/Nemotron-3.5-Super-VL",
  lightning: "nvidia/Nemotron-3_5-Lightning",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
  embedding: "Qwen/Qwen3-Embedding-8B",
};

const START = Date.parse("2026-10-30T06:12:04.000Z"); // 14:12:04 MYT

// Deterministic provider request id per step (no randomness, so renders are stable).
function requestId(seed: string): string {
  let h = 2166136261;
  let out = "";
  for (let round = 0; round < 2; round++) {
    for (const ch of seed + round) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return `tf-req-${out}`;
}

// [offset s, role, title, tool, summary, ms, tokensIn, tokensOut, costUsd, cached]
type Row = [number, Role, string, string | null, string, number, number | null, number | null, number | null, boolean];

// prettier-ignore
const rows: Row[] = [
  [0.0, "live-guard", "check the brief is taste only", "guard.live", "The brief names tastes, not who people are. Passes.", 38, null, null, null, false],
  [0.1, "embedding", "turn the free-text audience into Qloo tags", "embeddings.cosine", "\"quote 90s sitcoms, go to stand-up shows\" → 6 Qloo tags; closest is Sitcom at 0.82.", 412, 24, null, 0.00002, false],
  [0.6, "qloo", "resolve the three loves to Qloo seeds", "qloo.search", "stand-up comedy specials, 90s sitcoms, southern hip-hop → 5 seeds.", 690, null, null, null, false],
  [1.4, "super-vl", "plan the run", null, "Heatmap first, then score faces, read photos, block tastes, events, copy, budget, review.", 3120, 2840, 410, 0.0031, false],
  [4.6, "qloo", "map the audience over Atlanta", "qloo.insights urn:heatmap", "1,180 cells; hottest around Little Five Points, Old Fourth Ward and West End.", 1580, null, null, null, false],
  [6.3, "super-vl", "score every face by its cell", "score.faces", "214 faces scored; 14 candidates kept above 0.66 affinity.", 2240, 3920, 380, 0.0036, false],
  [8.6, "super-vl", "read site photo · ATL-0412 Moreland Ave", "vision.photo", "Clear sightline from the northbound lane, low clutter, face fills 31% of frame.", 5900, 1910, 140, 0.0024, false],
  [8.6, "super-vl", "read site photo · ATL-0388 Ponce de Leon", "vision.photo", "Clear read for eastbound traffic; digital face fills 24% of frame.", 6100, 1930, 150, 0.0024, false],
  [8.7, "super-vl", "read site photo · ATL-0527 Ralph David Abernathy", "vision.photo", "Clear sightline, medium clutter from shop signs; face fills 27% of frame.", 6050, 1925, 145, 0.0024, false],
  [8.7, "super-vl", "read site photo · ATL-0531 Lee St shelter", "vision.photo", "Street trees block the read side from 200 ft. Dropped.", 5800, 1905, 120, 0.0024, false],
  [8.8, "super-vl", "read site photo · ATL-0603 Flat Shoals Ave", "vision.photo", "Partial: a utility pole crosses the lower left; face still fills 22% of frame.", 6200, 1940, 160, 0.0024, false],
  [8.8, "super-vl", "read site photo · ATL-0451 Edgewood Ave", "vision.photo", "Clear read for westbound traffic, low clutter; face fills 29% of frame.", 5950, 1915, 140, 0.0024, false],
  [15.2, "qloo", "what each block over-indexes on", "qloo.insights urn:tag signal.location", "Top tags for 13 blocks; Little Five leans live comedy, vinyl and thrift fashion.", 2210, null, null, null, false],
  [15.2, "qloo", "which brands those blocks over-index on", "qloo.insights urn:entity:brand signal.location", "Brand affinity for the 13 blocks, used as supporting evidence.", 1890, null, null, null, true],
  [17.5, "super-vl", "keep 8 faces, drop 6", null, "Dropped 6: 1 blocked sightline, 3 weak evidence, 2 duplicate blocks. 8 faces left.", 2650, 3410, 290, 0.0028, false],
  [20.2, "tavily", "events near Little Five Points and Old Fourth Ward, 16 Nov to 13 Dec", "tavily.search", "11 results from the cache for this month.", 140, null, null, null, true],
  [20.2, "tavily", "events near West End and Castleberry Hill, 16 Nov to 13 Dec", "tavily.search", "9 results, fresh search.", 2380, null, null, null, false],
  [20.3, "tavily", "events near East Atlanta Village, Edgewood, Kirkwood, Reynoldstown", "tavily.search", "7 results from the cache for this month.", 120, null, null, null, true],
  [22.8, "lightning", "triage 27 event results", null, "Kept 7 events inside the flight and within 1 km of a face.", 1180, 2960, 240, 0.0011, false],
  [24.1, "lightning", "write copy · ATL-0412, ATL-0388", null, "6 lines, 7 words max, from what each block loves.", 1620, 1480, 210, 0.0016, false],
  [24.1, "lightning", "write copy · ATL-0527, ATL-0603", null, "6 lines, 7 words max, from what each block loves.", 1590, 1470, 205, 0.0016, false],
  [24.2, "lightning", "write copy · ATL-0451, ATL-0719", null, "6 lines, 7 words max, from what each block loves.", 1660, 1490, 215, 0.0016, false],
  [24.2, "lightning", "write copy · ATL-0634, ATL-0662", null, "6 lines, 7 words max, from what each block loves.", 1610, 1475, 208, 0.0016, false],
  [26.0, "live-guard", "check 24 copy lines", "guard.live", "23 pass; 1 West End line spoke for the residents, reworded around what the block loves.", 61, null, null, null, false],
  [26.2, "super-vl", "split $40,000 across 8 faces", "budget.split", "$39,600 across 8 neighbourhoods, none over 30%; $400 held back.", 2980, 3150, 330, 0.003, false],
  [29.3, "ultra", "review the whole plan", null, "Budget holds up. Reynoldstown and Edgewood lines clash in tone two stops apart; redraft one.", 14600, 11200, 980, 0.0164, false],
  [44.1, "lightning", "redraft the line Ultra flagged", null, "Reynoldstown now leans on the BeltLine, not the night.", 720, 640, 60, 0.0004, false],
  [44.9, "live-guard", "check the redrafted line", "guard.live", "Passes.", 22, null, null, null, false],
  [45.0, "qloo", "re-check heat for the 8 kept cells", "qloo.insights urn:heatmap", "Same cells, same order. No taste shift since last night's scan.", 95, null, null, null, true],
  [45.2, "super-vl", "write the evidence note per face", null, "8 notes, each number linked to the step that produced it.", 4180, 5620, 690, 0.0042, false],
  [49.5, "super-vl", "assemble the plan", null, "8 faces · $39,600 · ready for sign-off.", 1420, 2110, 260, 0.0019, false],
];

const steps: RunStep[] = rows.map(([offset, role, title, tool, summary, ms, tokensIn, tokensOut, costUsd, cached], i) => {
  const id = `step-${String(i + 1).padStart(2, "0")}`;
  const model = MODEL[role] ?? null;
  return {
    id,
    at: new Date(START + Math.round(offset * 1000)).toISOString(),
    role,
    model,
    title,
    tool,
    summary,
    ms,
    tokensIn,
    tokensOut,
    costUsd,
    requestId: model ? requestId(id) : null,
    cached,
    status: "ok",
  };
});

const costUsd = Math.round(steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0) * 10000) / 10000;

export const sampleRun: Run = Run.parse({
  id: "run-sample-porchlight",
  planId: "plan-sample-porchlight",
  kind: "plan",
  status: "done",
  steps,
  costUsd,
  startedAt: new Date(START).toISOString(),
  endedAt: new Date(START + 50920).toISOString(),
});
