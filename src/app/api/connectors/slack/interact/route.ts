import { getRuntime } from "@/server/connectors/composio/env";
import { errorResponse } from "@/server/connectors/composio/http";
import { handleSlackInteract } from "@/server/connectors/slack/interact";

export async function POST(req: Request) {
  try {
    return await handleSlackInteract(req, await getRuntime());
  } catch (e) {
    return errorResponse(e);
  }
}
