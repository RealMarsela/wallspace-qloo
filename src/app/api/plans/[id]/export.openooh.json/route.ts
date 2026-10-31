import { planCtx } from "@/server/connectors/composio/scope";
import { errorResponse, HttpError } from "@/server/connectors/composio/http";
import { loadPlanBundle } from "@/server/connectors/composio/plans";
import { planToOpenOoh } from "@/server/connectors/ooh/openooh";
import { owners } from "@/data/faces";

// GET /api/plans/:id/export.openooh.json: the plan as an OpenRTB 2.6-shaped DOOH deal request with OpenOOH venue types.
// The public sample plan needs no account; any other plan is its workspace's. Prepared for a DSP that accepts it; never submitted to an exchange.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await planCtx(req, id, false); // the sample plan, or the signed-in member's own
    const bundle = await loadPlanBundle(id, ctx.origin);
    if (!bundle) throw new HttpError(`plan ${id} was not found`, "plan_not_found", 404);
    const ownerNames = Object.fromEntries(owners.map((o) => [o.id, o.name]));
    const doc = planToOpenOoh({ ...bundle, appUrl: ctx.origin, ownerNames });
    return new Response(JSON.stringify(doc, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="wallspace-${id}.openooh.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
