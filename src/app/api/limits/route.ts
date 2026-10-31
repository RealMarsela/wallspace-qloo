import { connection } from "next/server";
import { LimitsResponse } from "@/contract";
import { buildLimits, getStore, runtimeEnv } from "@/server/db";

// GET /api/limits: what the app measured about itself (plans, cost, dropped faces, guard and NeMo rates, Qloo coverage gaps).
export async function GET() {
  await connection(); // reads the store: never prerendered at build time
  try {
    const built = await buildLimits(await getStore(runtimeEnv()));
    LimitsResponse.parse(built); // contract check; the additive costSource and samplePlan fields are returned too
    const body = built;
    return Response.json(body, { headers: { "cache-control": "public, max-age=30" } });
  } catch {
    return Response.json({ error: "Limits are unavailable right now.", code: "limits_unavailable" }, { status: 503 });
  }
}
