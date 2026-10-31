import { z } from "zod";
import { GuardRequest } from "@/contract";
import { guardText } from "@/server/guard";
import { jsonError, runtimeEnv, tokenFactoryFor } from "@/server/agent/env";

// Live taste-only guard. Deterministic first; Lightning only when a group word is ambiguous.
// Optional `loves` (the planner's current chips) lets the refusal offer their own taste as the rewrite.
const Body = GuardRequest.extend({ loves: z.array(z.string().max(80)).max(20).optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Send { text } with 1 to 2000 characters.", 400, "bad_request");
  const r = await guardText(parsed.data.text, { kind: "brief", loves: parsed.data.loves, tf: tokenFactoryFor(runtimeEnv()) });
  return Response.json({ ...r.verdict, meta: { ms: r.ms, path: r.path, model: r.steps[0]?.model ?? null, requestId: r.steps[0]?.requestId ?? null } });
}
