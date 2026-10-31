import { disconnectProvider } from "@/server/connectors/composio/connections";
import { memberCtx } from "@/server/connectors/composio/scope";
import { errorResponse } from "@/server/connectors/composio/http";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    await disconnectProvider(await memberCtx(req), provider);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
