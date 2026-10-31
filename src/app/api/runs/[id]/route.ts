import { runtimeEnv } from "@/server/agent/env";
import { readableRun, viewerWorkspace } from "@/server/auth/access";
import { guarded } from "@/server/auth/errors";
import { getStore } from "@/server/db";

// A run follows its plan: the public sample plan's runs, or the caller's own. Anyone else's answers 404.
export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  guarded(async () => {
    const { id } = await ctx.params;
    const env = runtimeEnv();
    return Response.json({ run: await readableRun(await getStore(env as never), id, await viewerWorkspace(request, env)) });
  });
