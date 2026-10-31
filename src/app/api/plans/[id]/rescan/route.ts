import { runtimeEnv } from "@/server/agent/env";
import { newId } from "@/server/agent/http";
import { writablePlan } from "@/server/auth/access";
import { authEnv } from "@/server/auth/env";
import { guarded } from "@/server/auth/errors";
import { requireMember } from "@/server/auth/session";
import { directRunner } from "@/server/agent/steps";
import { getStore } from "@/server/db";
import { executeRescan } from "@/server/workflows/rescan-core";

// "Run now": starts the same re-scan Workflow the nightly cron starts, scoped to this plan.
export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  guarded(async () => {
    const { workspace } = await requireMember(request, authEnv());
    const { id } = await ctx.params;
    const env = runtimeEnv();
    await writablePlan(await getStore(env as never), id, workspace.id);
    const params = { runId: newId("rescan"), trigger: "manual" as const, planId: id, at: new Date().toISOString() };
    if (env.RESCAN) await env.RESCAN.create({ id: params.runId, params });
    else void executeRescan(env, params, directRunner).catch(() => undefined);
    return Response.json({ runId: params.runId }, { status: 202 });
  });
