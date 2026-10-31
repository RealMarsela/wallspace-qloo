import { getRuntime } from "@/server/connectors/composio/env";
import { errorResponse } from "@/server/connectors/composio/http";
import { handleComposioWebhook } from "@/server/connectors/composio/webhook";

export async function POST(req: Request) {
  try {
    return await handleComposioWebhook(req, await getRuntime());
  } catch (e) {
    return errorResponse(e);
  }
}
