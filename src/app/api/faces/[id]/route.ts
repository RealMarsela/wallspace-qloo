import { getFace } from "@/server/inventory";

// GET /api/faces/:id  ->  { face, owner }
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^ATL-\d{4}$/.test(id)) return Response.json({ error: "Invalid face id.", code: "bad_request" }, { status: 400 });
  const out = getFace(id);
  if (!out) return Response.json({ error: "Face not found.", code: "not_found" }, { status: 404 });
  return Response.json(out, { headers: { "cache-control": "public, max-age=300" } });
}
