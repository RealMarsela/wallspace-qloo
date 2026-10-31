import { runtimeEnv } from "@/server/db";
import { getFace } from "@/server/inventory";
import { QlooError, buildAudienceCard, qlooClientFor } from "@/server/qloo";

const fail = (error: string, status: number, code: string) => Response.json({ error, code }, { status });

// GET /api/owner/faces/:id/card -> { card, face, source }. Qloo tag + brand insights at the face's point, from a live Qloo call or a KV copy
// of an earlier live call. `source` = { mode: "live", cached, requestIds, label }. When Qloo cannot answer the route returns
// { error, code: "qloo_unavailable" } (HTTP 503) and nothing is invented; "qloo_cap" (429) when the call budget is used up.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^ATL-\d{4}$/.test(id)) return fail("Invalid face id.", 400, "bad_request");
  const found = getFace(id);
  if (!found) return fail("Face not found.", 404, "not_found");
  try {
    const client = await qlooClientFor(runtimeEnv());
    const { card, source } = await buildAudienceCard(client, found.face);
    const cached = source.every((s) => s.cached);
    const requestIds = source.map((s) => s.requestId).filter((r): r is string => !!r);
    return Response.json({
      card, face: found.face,
      source: { mode: "live", cached, requestIds, label: `${cached ? "Qloo answer, KV copy of a live call" : "Live Qloo call"}${card.topTags.some((t) => t.lift) ? ", ranked against the Atlanta list" : ""}` },
    });
  } catch (e) {
    if (e instanceof QlooError && e.code === "cap_reached") return fail("The Qloo call budget is used up for now. Try again later.", 429, "qloo_cap");
    return fail("Qloo could not provide this audience card right now. Try again.", 503, "qloo_unavailable");
  }
}
