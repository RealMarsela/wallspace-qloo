import { ConnectionsResponse } from "@/contract";
import { listConnections } from "@/server/connectors/composio/connections";
import { memberCtx } from "@/server/connectors/composio/scope";
import { errorResponse } from "@/server/connectors/composio/http";

export async function GET(req: Request) {
  try {
    const connections = await listConnections(await memberCtx(req));
    return Response.json(ConnectionsResponse.parse({ connections }));
  } catch (e) {
    return errorResponse(e);
  }
}
