import { confirmConnected } from "@/server/connectors/composio/connections";
import { memberCtx } from "@/server/connectors/composio/scope";
import { errorResponse } from "@/server/connectors/composio/http";
import { authEnv } from "@/server/auth/env";
import { principalOf } from "@/server/auth/session";

// Composio sends the person back here after the provider consent screen; we land them on /app/connections.
// The session cookie rides this top-level GET (SameSite=Lax), so the connection is recorded for the signed-in workspace.
export async function GET(req: Request) {
  try {
    const provider = new URL(req.url).searchParams.get("provider") ?? "";
    const p = await principalOf(req, authEnv()).catch(() => null);
    if (!p?.workspace) return Response.redirect(new URL("/signin?next=/app/connections", req.url).toString(), 302);
    const ctx = await memberCtx(req);
    let ok = false;
    try {
      ok = await confirmConnected(ctx, provider);
    } catch {
      ok = false;
    }
    const dest = new URL("/app/connections", ctx.origin);
    dest.searchParams.set(ok ? "connected" : "pending", provider);
    return Response.redirect(dest.toString(), 302);
  } catch (e) {
    return errorResponse(e);
  }
}
