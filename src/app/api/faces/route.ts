import { FacesQuery } from "@/server/inventory";
import { listFaces } from "@/server/inventory";

// GET /api/faces?neighbourhood=  ->  { faces, owners }. Static inventory (src/data/faces.ts); the query makes the route dynamic.
export async function GET(request: Request) {
  const q = FacesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!q.success) return Response.json({ error: "Invalid query.", code: "bad_request" }, { status: 400 });
  const out = listFaces(q.data.neighbourhood);
  if (!out) return Response.json({ error: "No faces in that neighbourhood.", code: "unknown_neighbourhood" }, { status: 404 });
  return Response.json(out, { headers: { "cache-control": "public, max-age=300" } });
}
