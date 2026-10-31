import { api, type PlanData, type RunData } from "@/lib/api-client";

// A short-lived cache of plan and run answers, so moving between faces of one plan (or back from the plan page, which can
// call primePlan) opens instantly instead of waiting on the same request again.
const TTL = 60_000;
const plans = new Map<string, { at: number; p: Promise<PlanData> }>();
const runs = new Map<string, { at: number; p: Promise<RunData> }>();

function cached<T>(m: Map<string, { at: number; p: Promise<T> }>, id: string, load: () => Promise<T>): Promise<T> {
  const hit = m.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.p;
  const p = load();
  const entry = { at: Date.now(), p };
  m.set(id, entry);
  p.catch(() => {
    if (m.get(id) === entry) m.delete(id);
  });
  return p;
}

export const loadPlan = (id: string) => cached(plans, id, () => api.plan(id));
export const loadRun = (id: string) => cached(runs, id, () => api.run(id));
/** Seed the cache with a plan already on screen (the plan page), so its face sheets open with no loading state. */
export const primePlan = (data: PlanData) => plans.set(data.plan.id, { at: Date.now(), p: Promise.resolve(data) });
export const forgetPlan = (id: string) => plans.delete(id);
