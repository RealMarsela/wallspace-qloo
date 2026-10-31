import { PlanResponse } from "@/contract";
import { faceById } from "@/data/faces";
import { getStore as getAppStore } from "@/server/db";
import type { PlanBundle } from "./registry";

// Loads a plan with its brief and faces. Order: the app store (B1) with faces from the inventory, then the app's own
// GET /api/plans/:id (contract PlanResponse). Tests and other lanes can swap the loader.

export type PlanLoader = (planId: string, origin: string) => Promise<PlanBundle | null>;

let custom: PlanLoader | null = null;

export function setPlanLoader(fn: PlanLoader | null): void {
  custom = fn;
}

const storeLoader: PlanLoader = async (planId) => {
  try {
    const store = await getAppStore();
    const plan = await store.getPlan(planId);
    if (!plan) return null;
    const brief = await store.getBrief(plan.briefId);
    if (!brief) return null;
    const faces = plan.picks.flatMap((p) => {
      const f = faceById(p.faceId);
      return f ? [f] : [];
    });
    return { plan, brief, faces };
  } catch {
    return null;
  }
};

const fetchLoader: PlanLoader = async (planId, origin) => {
  try {
    const res = await fetch(`${origin}/api/plans/${encodeURIComponent(planId)}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const parsed = PlanResponse.safeParse(await res.json().catch(() => null));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export async function loadPlanBundle(planId: string, origin: string): Promise<PlanBundle | null> {
  if (custom) return custom(planId, origin);
  return (await storeLoader(planId, origin)) ?? fetchLoader(planId, origin);
}
