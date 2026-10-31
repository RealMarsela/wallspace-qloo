import { faces } from "@/data/faces";
import { runtimeEnv } from "@/server/agent/env";
import { planCsv } from "@/server/agent/csv";
import { readablePlan, viewerWorkspace } from "@/server/auth/access";
import { guarded } from "@/server/auth/errors";
import { getStore } from "@/server/db";

export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  guarded(async () => {
    const { id } = await ctx.params;
    const env = runtimeEnv();
    const plan = await readablePlan(await getStore(env as never), id, await viewerWorkspace(request, env));
    return new Response(planCsv(plan, faces), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="wallspace-plan-${plan.id}.csv"` } });
  });
