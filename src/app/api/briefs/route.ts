import { CreateBriefRequest, type Brief } from "@/contract";
import { jsonError, runtimeEnv, tokenFactoryFor } from "@/server/agent/env";
import { newId } from "@/server/agent/http";
import { authEnv } from "@/server/auth/env";
import { guarded } from "@/server/auth/errors";
import { requireMember } from "@/server/auth/session";
import { getStore } from "@/server/db";
import { guardText } from "@/server/guard";

// Creates a brief in the caller's workspace if it passes the taste-only guard. A refused brief is not stored: 422 with the verdict and its taste suggestion.
export const POST = (request: Request) => guarded(() => createBrief(request));

// The caller's own briefs, newest first.
export const GET = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    const { workspace } = await requireMember(request, env);
    return Response.json({ briefs: await (await getStore(env as never)).listBriefs(workspace.id) });
  });

async function createBrief(request: Request) {
  const { workspace } = await requireMember(request, authEnv());
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = CreateBriefRequest.safeParse(body && typeof body === "object" ? { brandVoice: null, ...body } : body);
  if (!parsed.success) return jsonError("The brief needs a brand, an audience, a budget and flight dates.", 400, "bad_request");
  const b = parsed.data;
  const env = runtimeEnv();
  const g = await guardText(`${b.audienceText}. ${b.loves.join(", ")}`, { kind: "brief", loves: b.loves, tf: tokenFactoryFor(env) });
  if (g.verdict.status !== "pass") return Response.json({ error: g.verdict.reasons[0] ?? "This brief targets people by identity.", code: "guard_blocked", guard: g.verdict }, { status: 422 });
  const brief: Brief = {
    id: newId("brief"), brandName: b.brandName, brandSample: /\(sample/i.test(b.brandName), audienceText: b.audienceText, loves: b.loves, seeds: [], city: "atlanta",
    budgetUsd: b.budgetUsd, flightStart: b.flightStart, flightWeeks: b.flightWeeks, brandVoice: b.brandVoice ?? null, creativeUrl: b.creativeUrl ?? null, createdAt: new Date().toISOString(),
  };
  const store = await getStore(env as never);
  await store.putBrief(brief);
  await store.assignOwner("brief", brief.id, workspace.id);
  return Response.json({ brief, guard: g.verdict });
}
