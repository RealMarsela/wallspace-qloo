"use client";
import { BriefsResponse, type Brief } from "@/contract";
import { useAsync } from "@/components/ui/useAsync";
import { api, type PlansData } from "@/lib/api-client";

export type PlanListItem = PlansData["plans"][number];
export interface DashRow extends PlanListItem {
  brief: Brief | null;
}

/** The caller's own briefs (GET /api/briefs). Empty when signed out or in mock mode: rows then show the plan id. */
async function ownBriefs(): Promise<Brief[]> {
  try {
    const res = await fetch("/api/briefs", { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    const parsed = BriefsResponse.safeParse(await res.json());
    return parsed.success ? parsed.data.briefs : [];
  } catch {
    return [];
  }
}

/** Plans list joined with their briefs: one /api/plans, one /api/briefs, and one plan read for the public sample's brief. */
export async function loadDashboard(): Promise<DashRow[]> {
  const [{ plans }, briefs] = await Promise.all([api.plans(), ownBriefs()]);
  const byId = new Map(briefs.map((b) => [b.id, b]));
  const sample = plans.find((p) => p.sample);
  if (sample && !byId.has(sample.briefId)) {
    const data = await api.plan(sample.id).catch(() => null);
    if (data) byId.set(data.brief.id, data.brief);
  }
  return plans.map((p) => ({ ...p, brief: byId.get(p.briefId) ?? null }));
}

export function useDashboard() {
  return useAsync(loadDashboard, "dashboard");
}

const dayTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const created = (iso: string) => dayTime.format(new Date(iso));

/** Text the dashboard search matches: brand, loves, audience, plan id, status. */
export const haystack = (r: DashRow) => `${r.brief?.brandName ?? ""} ${r.brief?.loves.join(" ") ?? ""} ${r.brief?.audienceText ?? ""} ${r.id} ${r.status}`.toLowerCase();
