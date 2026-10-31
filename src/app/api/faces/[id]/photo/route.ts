import { PHOTOS } from "@/data/photos";
import { runtimeEnv } from "@/server/db";

// GET /api/faces/:id/photo: the site photo stored in R2 (WS_BLOB, photos/<id>.jpg). Public; the credit is on the face (photoCredit).
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const meta = /^ATL-\d{4}$/.test(id) ? PHOTOS[id] : undefined;
  if (!meta) return Response.json({ error: "No photo for this face.", code: "no_photo" }, { status: 404 });
  const bucket = runtimeEnv().WS_BLOB;
  if (!bucket) return Response.json({ error: "Photo storage is not available here.", code: "no_storage" }, { status: 503 });
  const obj = await bucket.get(meta.r2Key).catch(() => null);
  if (!obj) return Response.json({ error: "Photo not found.", code: "no_photo" }, { status: 404 });
  return new Response(await obj.arrayBuffer(), {
    headers: { "content-type": obj.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "public, max-age=86400" },
  });
}
