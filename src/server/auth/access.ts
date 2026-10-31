import type { Plan, Run } from "@/contract";
import type { Store } from "../db";
import type { Env } from "./env";
import { ApiFailure, notFound } from "./errors";
import { principalOf } from "./session";

// Who may see what. A plan flagged sample is public and read-only; every other brief, plan and run belongs to one workspace and
// answers 404 (not 403) to anyone else, so an id reveals nothing about another workspace.

export async function canReadPlan(store: Store, plan: Plan, workspaceId: string | null): Promise<boolean> {
  if (plan.sample) return true;
  return workspaceId !== null && (await store.ownerOf("plan", plan.id)) === workspaceId;
}

/** A plan the viewer may read (public sample or own), else 404. */
export async function readablePlan(store: Store, planId: string, workspaceId: string | null): Promise<Plan> {
  const plan = await store.getPlan(planId);
  if (!plan || !(await canReadPlan(store, plan, workspaceId))) throw notFound("Plan");
  return plan;
}

/** A plan the member may change: their own. The public sample is readable but not writable (403). */
export async function writablePlan(store: Store, planId: string, workspaceId: string): Promise<Plan> {
  const plan = await readablePlan(store, planId, workspaceId);
  if ((await store.ownerOf("plan", plan.id)) !== workspaceId) throw new ApiFailure(403, "sample_read_only", "The sample plan is read-only. Create your own brief to plan.");
  return plan;
}

export async function ownedBrief(store: Store, briefId: string, workspaceId: string) {
  const brief = (await store.ownerOf("brief", briefId)) === workspaceId ? await store.getBrief(briefId) : null;
  if (!brief) throw notFound("Brief");
  return brief;
}

/** Run visibility follows the run's plan. Used by the run routes and the live WebSocket. */
export async function readableRun(store: Store, runId: string, workspaceId: string | null): Promise<Run> {
  const run = await store.getRun(runId);
  const plan = run ? await store.getPlan(run.planId) : null;
  if (!run || !plan || !(await canReadPlan(store, plan, workspaceId))) throw notFound("Run");
  return run;
}

/** The viewer's workspace id from a request, or null when signed out. Never throws. */
export async function viewerWorkspace(request: Request, env: Env): Promise<string | null> {
  try {
    return (await principalOf(request, env))?.workspace?.id ?? null;
  } catch {
    return null;
  }
}
