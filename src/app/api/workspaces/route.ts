import { CreateWorkspaceRequest } from "@/contract";
import { authEnv } from "@/server/auth/env";
import { guarded, notFound, readJson } from "@/server/auth/errors";
import { requireUser } from "@/server/auth/session";
import { onboardingFor, publicWorkspace } from "@/server/auth/views";
import { createWorkspace } from "@/server/auth/workspaces";

// POST creates the caller's workspace (one per user, city fixed to atlanta) and starts onboarding at "tools". GET returns it.
export const POST = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    const p = await requireUser(request, env);
    const input = CreateWorkspaceRequest.parse(await readJson(request));
    const workspace = await createWorkspace(p.db, p.user.id, input);
    return Response.json({ workspace: publicWorkspace(workspace), onboarding: await onboardingFor(env, { ...p, workspace }) }, { status: 201 });
  });

export const GET = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    const p = await requireUser(request, env);
    if (!p.workspace) throw notFound("Workspace");
    return Response.json({ workspace: publicWorkspace(p.workspace), onboarding: await onboardingFor(env, p) });
  });
