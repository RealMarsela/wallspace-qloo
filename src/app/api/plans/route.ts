import { StartPlanRequest } from "@/contract";
import { jsonError, runtimeEnv } from "@/server/agent/env";
import { ownedBrief, viewerWorkspace } from "@/server/auth/access";
import { authEnv } from "@/server/auth/env";
import { guarded, readJson } from "@/server/auth/errors";
import { requireMember } from "@/server/auth/session";
import { getStore } from "@/server/db";
import { claimRunSlot, startPlan } from "@/server/workflows/start";

// Starts the plan Workflow for one of the caller's briefs and answers at once with the ids; the page follows the run over /api/runs/:id/live.
export const POST = (request: Request) =>
  guarded(async () => {
    const { workspace } = await requireMember(request, authEnv());
    const parsed = StartPlanRequest.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("Send { briefId }.", 400, "bad_request");
    const env = runtimeEnv();
    const brief = await ownedBrief(await getStore(env as never), parsed.data.briefId, workspace.id);
    const slot = await claimRunSlot(env, workspace.id);
    if (!slot.ok) {
      return jsonError(slot.reason === "daily_cap" ? "Today's live plan runs are used up. The sample plan is always open." : "You have used your live runs for today. The sample plan is always open.", 429, slot.reason);
    }
    return Response.json(await startPlan(env, brief, workspace.id, { workspaceId: workspace.id }), { status: 202 });
  });

// The caller's plans plus the public sample plan; signed out, just the sample plan.
export const GET = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    const plans = await (await getStore(env as never)).listPlans(50, { workspaceId: await viewerWorkspace(request, env) });
    return Response.json({ plans: plans.map((p) => ({ id: p.id, briefId: p.briefId, status: p.status, spendUsd: p.spendUsd, createdAt: p.createdAt, sample: p.sample })) });
  });
