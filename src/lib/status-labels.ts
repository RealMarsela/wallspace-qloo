import type { Plan, Run, RunStep } from "@/contract";

// Plain words for every plan, run, step and review status. UI never prints a raw slug; it asks here.

export const PLAN_STATUS_LABEL: Record<Plan["status"], string> = {
  running: "Running",
  ready: "Ready",
  "awaiting-nemo": "Awaiting NeMo sign-off",
  "nemo-checked": "NeMo-checked",
  failed: "Run failed",
};

export const RUN_STATUS_LABEL: Record<Run["status"], string> = { running: "Running", done: "Done", failed: "Stopped" };

export const REVIEW_STATUS_LABEL: Record<"ok" | "flagged" | "redrafted", string> = { ok: "No flags", flagged: "Copy needs a human", redrafted: "Redrafted" };

export const GUARD_STATUS_LABEL: Record<"pass" | "blocked" | "rewritten", string> = { pass: "passed", blocked: "blocked", rewritten: "rewritten" };

const CODE_WORDS: Record<string, string> = { model_unavailable: "model unavailable" };
const words = (code: string) => CODE_WORDS[code] ?? code.replace(/[_-]+/g, " ").trim();

/** A run step's status: "Done", "Skipped: model unavailable", "Failed: rate limited". */
export function stepStatusLabel(step: Pick<RunStep, "status" | "errorCode">): string {
  if (step.status === "ok") return "Done";
  const head = step.status === "skipped" ? "Skipped" : "Failed";
  return step.errorCode ? `${head}: ${words(step.errorCode)}` : head;
}

const ANY: Record<string, string> = { ...PLAN_STATUS_LABEL, ...RUN_STATUS_LABEL, ...REVIEW_STATUS_LABEL, ok: "Done", error: "Failed", skipped: "Skipped" };

/** Any status slug in plain words; unknown slugs lose their dashes and get a capital. */
export function statusLabel(slug: string): string {
  if (ANY[slug]) return ANY[slug];
  const w = words(slug);
  return w.charAt(0).toUpperCase() + w.slice(1);
}
