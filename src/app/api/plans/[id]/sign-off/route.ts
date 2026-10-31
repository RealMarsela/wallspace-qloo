import { jsonError, runtimeEnv } from "@/server/agent/env";
import { signOffPlan } from "@/server/agent/signoff";
import { writablePlan } from "@/server/auth/access";
import { authEnv } from "@/server/auth/env";
import { guarded } from "@/server/auth/errors";
import { requireMember } from "@/server/auth/session";
import { getStore } from "@/server/db";

// Live guard over every line now; the plan then waits for the NeMo job (started from the CLI on demand). Own plans only.
export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  guarded(async () => {
    const { workspace } = await requireMember(request, authEnv());
    const { id } = await ctx.params;
    const store = await getStore(runtimeEnv() as never);
    await writablePlan(store, id, workspace.id);
    const r = await signOffPlan(store, id);
    if (!r) return jsonError("Plan not found.", 404, "not_found");
    if (r.plan.picks.length === 0) return jsonError("The plan has no lines yet.", 409, "plan_not_ready");
    return Response.json(r);
  });
