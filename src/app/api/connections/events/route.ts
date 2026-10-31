import { EventsQuery, EventsResponse } from "@/contract/connectors-comms";
import { readablePlan, viewerWorkspace } from "@/server/auth/access";
import { authEnv } from "@/server/auth/env";
import { getStore as getAppStore } from "@/server/db";
import { demoCtx, memberCtx } from "@/server/connectors/composio/scope";
import { errorResponse } from "@/server/connectors/composio/http";

// Plan event log (mail sent, replies and their class, Slack approvals) and per-provider logs.
// With planId: the sample plan's log, or the log of one of the caller's own plans (404 otherwise). Without: the caller's provider-level log.
export async function GET(req: Request) {
  try {
    const q = EventsQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
    const env = authEnv();
    if (q.planId) {
      if (q.planId.startsWith("pitch-")) {
        const ctx = await memberCtx(req); // pitch threads are shared plan ids across workspaces: filter by sender
        const events = (await ctx.store.listEvents({ provider: q.provider, limit: 500 })).filter((e) => e.planId === q.planId).slice(0, q.limit);
        return Response.json(EventsResponse.parse({ events }));
      }
      await readablePlan(await getAppStore(env as never), q.planId, await viewerWorkspace(req, env));
      const ctx = await demoCtx(req); // plan-bound events are authorised by the plan check above
      return Response.json(EventsResponse.parse({ events: await ctx.store.listEvents({ planId: q.planId, provider: q.provider, limit: q.limit }) }));
    }
    const ctx = await memberCtx(req);
    return Response.json(EventsResponse.parse({ events: await ctx.store.listEvents({ provider: q.provider, limit: q.limit }) }));
  } catch (e) {
    return errorResponse(e);
  }
}
