import type { RunStep } from "@/contract";

// Pure views of a streamed run: which pipeline stages it has reached and which steps are "moments" worth marking.

export interface Stage {
  id: string;
  label: string;
  test: (s: RunStep) => boolean;
  optional?: boolean;
}

export const STAGES: Stage[] = [
  { id: "guard", label: "Brief guard", test: (s) => s.role === "live-guard" && /brief/i.test(s.title) },
  { id: "embedding", label: "Tag match", test: (s) => s.role === "embedding" },
  { id: "map", label: "Qloo map", test: (s) => s.role === "qloo" && /heatmap|map the audience/i.test(`${s.title} ${s.tool ?? ""}`) },
  { id: "score", label: "Score faces", test: (s) => /^score/i.test(s.title) },
  { id: "vision", label: "Vision", test: (s) => /site photo/i.test(s.title) },
  { id: "tastes", label: "Block tastes", test: (s) => s.role === "qloo" && /over-index|urn:tag/i.test(`${s.title} ${s.tool ?? ""}`) },
  { id: "budget", label: "Budget", test: (s) => /budget|split \$/i.test(`${s.title} ${s.tool ?? ""}`) },
  { id: "events", label: "Events", test: (s) => s.role === "tavily" },
  { id: "copy", label: "Copy", test: (s) => s.role === "lightning" && !/redraft/i.test(s.title) },
  { id: "lines", label: "Line guard", test: (s) => s.role === "live-guard" && /line/i.test(s.title) },
  { id: "review", label: "Ultra review", test: (s) => s.role === "ultra" },
  { id: "redraft", label: "Redraft", test: (s) => /redraft/i.test(s.title), optional: true },
];

export type StageState = "done" | "current" | "pending" | "skipped";

/** State per stage: reached stages are done, the furthest reached one is current while the run streams, an optional stage
 *  with nothing to do (no flags to redraft) is skipped once the run is over. */
export function stageStates(steps: RunStep[], finished: boolean): StageState[] {
  const reached = STAGES.map((st) => steps.some(st.test));
  const last = reached.lastIndexOf(true);
  return STAGES.map((st, i) => {
    if (reached[i]) return !finished && i === last ? "current" : "done";
    if (finished && st.optional) return "skipped";
    return "pending";
  });
}

export const faceOf = (s: RunStep) => /ATL-\d+/.exec(s.title)?.[0] ?? /ATL-\d+/.exec(s.summary)?.[0] ?? null;

export type Moment = { kind: "vision-drop" | "vision-kept" | "flagged" | "redrafted" | "retried"; label: string };

/** Marks a step: a site-photo read that dropped its face, the Ultra review's flags, the redraft they caused, retried calls. */
export function momentOf(step: RunStep, next: RunStep | undefined, picked: Set<string> | null): Moment | null {
  if (/read (?:the )?site photo/i.test(step.title) && step.status === "ok") {
    const face = faceOf(step);
    const dropped = /dropped|blocked/i.test(step.summary) || (picked !== null && face !== null && !picked.has(face));
    return dropped ? { kind: "vision-drop", label: "Vision drop" } : { kind: "vision-kept", label: "Vision kept" };
  }
  if (step.role === "ultra") {
    const n = Number(/(\d+) flag/i.exec(step.summary)?.[1] ?? 0);
    return n > 0 ? { kind: "flagged", label: `${n} flagged` } : null;
  }
  if (/redraft/i.test(step.title)) return { kind: "redrafted", label: "Redrafted" };
  if (step.status === "error" && next && next.title.replace(/\s*\(loose\)$/, "") === step.title.replace(/\s*\(loose\)$/, "")) return { kind: "retried", label: "invalid output, retried" };
  return null;
}

export interface Totals {
  steps: number;
  ms: number;
  tokens: number;
  costUsd: number;
}

export function totals(steps: RunStep[]): Totals {
  return {
    steps: steps.length,
    ms: steps.reduce((n, s) => n + s.ms, 0),
    tokens: steps.reduce((n, s) => n + (s.tokensIn ?? 0) + (s.tokensOut ?? 0), 0),
    costUsd: steps.reduce((n, s) => n + (s.costUsd ?? 0), 0),
  };
}
