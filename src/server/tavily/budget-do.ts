import { DurableObject } from "cloudflare:workers";
import { PREWARM_CAPS, TavilyBudgetCore, VISITOR_CAPS } from "./budget-core";

// Durable Object TavilyBudget: one global ledger of Tavily credits (see budget-core.ts for the caps).
export class TavilyBudget extends DurableObject {
  private core = new TavilyBudgetCore(this.ctx.storage);

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/status") return Response.json(await this.core.status());
    const body = (await request.json().catch(() => null)) as { sessionId?: string; credits?: number; bucket?: string } | null;
    if (!body || typeof body.sessionId !== "string" || typeof body.credits !== "number") return Response.json({ error: "bad request", code: "bad_request" }, { status: 400 });
    if (path === "/reserve") return Response.json(await this.core.reserve(body.sessionId, body.credits, body.bucket === "prewarm" ? PREWARM_CAPS : VISITOR_CAPS));
    if (path === "/refund") {
      await this.core.refund(body.sessionId, body.credits);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "not found", code: "not_found" }, { status: 404 });
  }
}
