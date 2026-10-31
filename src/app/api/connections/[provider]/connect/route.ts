import { ConnectResponse } from "@/contract";
import { connectProvider } from "@/server/connectors/composio/connections";
import { memberCtx } from "@/server/connectors/composio/scope";
import { errorResponse } from "@/server/connectors/composio/http";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    const out = await connectProvider(await memberCtx(req), provider);
    return Response.json(ConnectResponse.parse(out));
  } catch (e) {
    return errorResponse(e);
  }
}
