import { z } from "zod";
import { errorResponse, readJson } from "@/server/connectors/composio/http";
import { demoCtx, syncCtx } from "@/server/connectors/composio/scope";
import { syncPlanReplies } from "@/server/connectors/mail/sync";
import { syncRecentRepliesAllWorkspaces } from "@/server/connectors/mail/sync-all";

// Pulls new replies into the plan event log. Called by the plan page while it is open and by the cron trigger.
// With { planId } it syncs that plan (the sample plan, or the signed-in owner's); without, the cron path: every workspace's
// mail threads from the last 72 hours, each polled with its own Composio user.
const Body = z.object({ planId: z.string().min(1).optional() });

export async function POST(req: Request) {
  try {
    const body = Body.parse(await readJson(req).catch(() => ({})));
    if (body.planId) return Response.json(await syncPlanReplies(await syncCtx(req, body.planId), body.planId));
    return Response.json(await syncRecentRepliesAllWorkspaces(await demoCtx(req)));
  } catch (e) {
    return errorResponse(e);
  }
}
