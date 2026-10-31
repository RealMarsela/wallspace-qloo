import { planCtx } from "@/server/connectors/composio/scope";
import { dispatchSend } from "@/server/connectors/composio/dispatch";
import { errorResponse, readJson } from "@/server/connectors/composio/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    return Response.json(await dispatchSend(await planCtx(req, id, true), id, body));
  } catch (e) {
    return errorResponse(e);
  }
}
