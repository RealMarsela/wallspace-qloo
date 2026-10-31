import { DurableObject } from "cloudflare:workers";
import { DEFAULT_CAPS, QlooMeterCore, type MeterCaps } from "../src/server/qloo/meter-core";

interface MeterEnv {
  QLOO_CAP_TOTAL?: string;
  QLOO_CAP_DAY?: string;
}

/**
 * QLOO_METER: one global instance ("qloo") counting live Qloo calls against a hard cap (default 6,000 total, 1,500 a day;
 * override with the QLOO_CAP_TOTAL and QLOO_CAP_DAY variables). Only worker/index.ts imports this file.
 * Requests: POST /reserve {n?}, POST /refund {n?}, GET /status. A refused reserve answers 429 with the reason.
 */
export class QlooMeter extends DurableObject<MeterEnv> {
  private readonly core = new QlooMeterCore(this.ctx.storage);

  private caps(): MeterCaps {
    const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
    return { total: num(this.env.QLOO_CAP_TOTAL, DEFAULT_CAPS.total), day: num(this.env.QLOO_CAP_DAY, DEFAULT_CAPS.day) };
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/status") return Response.json(await this.core.status(this.caps()));
    if (request.method !== "POST") return Response.json({ error: "method not allowed" }, { status: 405 });
    const body = (await request.json().catch(() => ({}))) as { n?: unknown };
    const n = typeof body.n === "number" && body.n > 0 && body.n <= 50 ? Math.floor(body.n) : 1;
    if (path === "/reserve") {
      const res = await this.core.reserve(n, this.caps());
      return Response.json(res, { status: res.ok ? 200 : 429 });
    }
    if (path === "/refund") return Response.json(await this.core.refund(n, this.caps()));
    return Response.json({ error: "not found" }, { status: 404 });
  }
}
