import type { RunStep } from "@/contract";
import type { Ink } from "@/components/ui/Pill";
import type { Role } from "@/components/ui/models";
import { SAMPLE_PLAN_ID, SAMPLE_RUN_ID, faceHref, runHref } from "@/lib/routes";

// The pipeline as the How it works page draws it. One stop per step; each names what runs it and where it can be seen
// working. Numbers on the page come from the sample run's own log (matched by `match`), never typed in here.

export type Variant = "app" | "public";

export interface StopLink {
  href: string;
  label: string;
  /** Signed-out visitors cannot open it: shown as "sign in to try". */
  signIn?: boolean;
}

export interface Stop {
  n: number;
  phase: string;
  title: string;
  roles: Role[];
  /** Plain name of a step run by Wallspace code rather than a model. */
  tool?: string;
  ink: Ink;
  does: string;
  link: (v: Variant) => StopLink;
  match?: (s: RunStep) => boolean;
}

const run = (stepId?: string) => (stepId ? `${runHref(SAMPLE_RUN_ID)}#${encodeURIComponent(stepId)}` : runHref(SAMPLE_RUN_ID));
const plan = (anchor = "") => `/sample${anchor}`;
const face = (id: string) => faceHref(SAMPLE_PLAN_ID, id);
const has = (s: RunStep, re: RegExp) => re.test(s.title);

export const stops: Stop[] = [
  {
    n: 1, phase: "Brief", title: "Taste-only guard on the brief", roles: ["live-guard"], ink: "poster",
    does: "Refuses targeting by race, religion, age, health or other identity, and offers a taste-based rewrite you can use in one click.",
    link: (v) => (v === "app" ? { href: "/app/new", label: "Try it on a brief" } : { href: "/app/new", label: "Sign in to try", signIn: true }),
    match: (s) => s.role === "live-guard" && has(s, /brief/i),
  },
  {
    n: 2, phase: "Audience", title: "Brief to Qloo tags", roles: ["embedding"], ink: "lilac",
    does: "Qwen3 Embedding 8B turns your free-text audience into the closest Qloo taste tags by meaning.",
    link: () => ({ href: run("run-sample:embed.0"), label: "See the step" }),
    match: (s) => s.role === "embedding",
  },
  {
    n: 3, phase: "Audience", title: "Plan the Qloo calls", roles: ["super-vl"], ink: "cobalt",
    does: "Nemotron 3.5 Super VL is the planner: it decides which Qloo tools to call next, by tool calling.",
    link: () => ({ href: run("run-sample:resolve.0"), label: "See the tool calls" }),
    match: (s) => s.role === "super-vl" && has(s, /plan the qloo/i),
  },
  {
    n: 4, phase: "Audience", title: "Where the audience lives", roles: ["qloo"], ink: "signal",
    does: "Qloo's heatmap (urn:heatmap) scores taste by place across Atlanta. Aggregate, never a device or a person.",
    link: () => ({ href: plan(), label: "See the heat on the map" }),
    match: (s) => s.role === "qloo",
  },
  {
    n: 5, phase: "Audience", title: "Score every face", roles: [], tool: "Wallspace scorer", ink: "park",
    does: "Every face gets the affinity of its block, weighted for visibility and cost. Faces with thin evidence are dropped.",
    link: () => ({ href: plan(), label: "See the ranked picks" }),
    match: (s) => has(s, /^score /i),
  },
  {
    n: 6, phase: "Site checks", title: "Read the site photos", roles: ["super-vl"], ink: "cobalt",
    does: "Super VL looks at each candidate's photo for sightline and clutter, and drops a face it cannot see well.",
    link: () => ({ href: run("run-sample:inspect.1"), label: "See ATL-0101 dropped" }),
    match: (s) => s.role === "super-vl" && /site photo/i.test(s.title),
  },
  {
    n: 7, phase: "Site checks", title: "What each block over-indexes on", roles: ["qloo"], ink: "signal",
    does: "Qloo tags around each face with their lift against Atlanta. Every answer is a live Qloo call or a cached copy of one; if Qloo cannot answer, the block keeps no tag evidence and the step says so.",
    link: () => ({ href: face("ATL-0116"), label: "See a block's tags" }),
    match: (s) => s.role === "qloo" && has(s, /over-indexes/i),
  },
  {
    n: 8, phase: "Site checks", title: "Split the budget", roles: [], tool: "Wallspace optimiser", ink: "park",
    does: "Spend is spread across the picks so no neighbourhood takes more than 30%.",
    link: () => ({ href: plan("#budget-split"), label: "See the split" }),
    match: (s) => has(s, /^split /i),
  },
  {
    n: 9, phase: "Site checks", title: "Events during the flight", roles: ["tavily"], ink: "lilac",
    does: "Tavily searches for events near each face in the flight dates; results are cached by neighbourhood and month.",
    link: () => ({ href: face("ATL-0116"), label: "See an event by a face" }),
    match: (s) => s.role === "tavily",
  },
  {
    n: 10, phase: "Copy and review", title: "Write three lines per face", roles: ["lightning"], ink: "signal",
    does: "Nemotron 3.5 Lightning writes three lines of at most seven words from what that block loves.",
    link: () => ({ href: face("ATL-0021"), label: "See the lines" }),
    match: (s) => s.role === "lightning" && !has(s, /redraft/i),
  },
  {
    n: 11, phase: "Copy and review", title: "Guard every line", roles: ["live-guard"], ink: "poster",
    does: "The same taste-only guard checks each line as it is written.",
    link: () => ({ href: run("run-sample:copy.16"), label: "See the check" }),
    match: (s) => s.role === "live-guard" && has(s, /line/i),
  },
  {
    n: 12, phase: "Copy and review", title: "Review the whole plan", roles: ["ultra"], ink: "cobalt",
    does: "Nemotron 3 Ultra 550B reads the finished plan for clashing copy, budget sense and brand fit. Flagged faces are redrafted.",
    link: () => ({ href: face("ATL-0046"), label: "See the redrafted face" }),
    match: (s) => s.role === "ultra" || (s.role === "lightning" && has(s, /redraft/i)),
  },
  {
    n: 13, phase: "Copy and review", title: "Sign-off with NeMo Guardrails", roles: ["nemo"], ink: "poster",
    does: "When you sign a plan off, NVIDIA NeMo Guardrails re-checks every line as a Nebius Serverless Job and stamps the plan with the job ID.",
    link: () => ({ href: plan("#plan-actions"), label: "See the NeMo status" }),
  },
  {
    n: 14, phase: "Send", title: "Send it where you work", roles: [], tool: "Slack, Gmail, Outlook, HubSpot, Sheets, Calendar, OpenOOH", ink: "park",
    does: "One button sends the plan for approval, as an email, a CRM deal, a sheet or calendar dates, or exports an OpenOOH venue list.",
    link: (v) => (v === "app" ? { href: "/app/connections", label: "Connect your tools" } : { href: "/app/connections", label: "Sign in to connect", signIn: true }),
  },
];

export const phases = [...new Set(stops.map((s) => s.phase))];

export interface Measured {
  calls: number;
  ms: number;
  tokens: number;
  costUsd: number;
  cached: boolean;
}

/** What the sample run logged for one stop. */
export function measure(stop: Stop, steps: RunStep[]): Measured | null {
  if (!stop.match) return null;
  const hit = steps.filter(stop.match);
  if (hit.length === 0) return null;
  return hit.reduce<Measured>(
    (m, s) => ({ calls: m.calls + 1, ms: m.ms + s.ms, tokens: m.tokens + (s.tokensIn ?? 0) + (s.tokensOut ?? 0), costUsd: m.costUsd + (s.costUsd ?? 0), cached: m.cached && s.cached }),
    { calls: 0, ms: 0, tokens: 0, costUsd: 0, cached: true },
  );
}
