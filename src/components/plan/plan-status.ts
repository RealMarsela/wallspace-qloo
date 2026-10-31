import type { Plan } from "@/contract";
import type { Status } from "@/components/ui/Badge";
import { PLAN_STATUS_LABEL as L } from "@/lib/status-labels";

export type PlanStatus = Plan["status"];

/** One label and badge tone per plan status, used by the dashboard, the plan header and the action bar. */
export const planStatus: Record<PlanStatus, { label: string; badge: Status; hint: string }> = {
  running: { label: L.running, badge: "running", hint: "The agent is still picking faces." },
  ready: { label: L.ready, badge: "warn", hint: "Picks and lines are ready; sign off to queue the NeMo check." },
  "awaiting-nemo": { label: L["awaiting-nemo"], badge: "info", hint: "Signed off; every line waits for the NeMo Guardrails job." },
  "nemo-checked": { label: L["nemo-checked"], badge: "ok", hint: "Every line passed NeMo Guardrails." },
  failed: { label: L.failed, badge: "guard", hint: "The run stopped before it picked faces." },
};

export type PlanFilter = "all" | "ready" | "running" | "signoff" | "nemo";

export const filterMatch: Record<PlanFilter, (s: PlanStatus) => boolean> = {
  all: () => true,
  ready: (s) => s === "ready" || s === "awaiting-nemo" || s === "nemo-checked",
  running: (s) => s === "running",
  signoff: (s) => s === "ready",
  nemo: (s) => s === "nemo-checked",
};
