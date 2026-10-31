import { z } from "zod";
import { errorResponse, readJson } from "@/server/connectors/composio/http";
import { demoCtx, syncCtx } from "@/server/connectors/composio/scope";
import { recordsDeps } from "@/server/connectors/records/adapter";
import { pollRecords } from "@/server/connectors/records";
import "@/server/connectors/composio/boot";

// Pulls changes from the customer's tools into the plan event log: HubSpot deal stage, sheet edits, calendar changes.
// Called by "Sync now" on the plan page and by the cron trigger. With { planId }: that plan, with its workspace's connections
// (the sample plan or the signed-in owner's). No body (cron): the demo workspace only; other workspaces sync from their plan page.
const Body = z.object({ planId: z.string().min(1).optional() });

export async function POST(req: Request) {
  try {
    const body = Body.parse(await readJson(req).catch(() => ({})));
    const ctx = body.planId ? await syncCtx(req, body.planId) : await demoCtx(req);
    return Response.json(await pollRecords(recordsDeps(ctx), { planId: body.planId }));
  } catch (e) {
    return errorResponse(e);
  }
}
