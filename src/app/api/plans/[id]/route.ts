import { faces } from "@/data/faces";
import { jsonError, runtimeEnv } from "@/server/agent/env";
import { readablePlan, viewerWorkspace } from "@/server/auth/access";
import { guarded } from "@/server/auth/errors";
import { getStore } from "@/server/db";

// The public sample plan, or the caller's own plan. Anyone else's plan answers 404.
export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  guarded(async () => {
    const { id } = await ctx.params;
    const env = runtimeEnv();
    const store = await getStore(env as never);
    const plan = await readablePlan(store, id, await viewerWorkspace(request, env));
    const brief = await store.getBrief(plan.briefId);
    if (!brief) return jsonError("Plan's brief not found.", 404, "not_found");
    return Response.json({ plan, brief, faces });
  });
