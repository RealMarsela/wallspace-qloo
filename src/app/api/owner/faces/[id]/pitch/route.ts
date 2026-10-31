import { memberCtx } from "@/server/connectors/composio/scope";
import { errorResponse, readJson } from "@/server/connectors/composio/http";
import { dispatchPitch } from "@/server/connectors/composio/pitch";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    return Response.json(await dispatchPitch(await memberCtx(req), id, body));
  } catch (e) {
    return errorResponse(e);
  }
}
