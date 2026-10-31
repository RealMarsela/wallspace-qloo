import { PatchOnboardingRequest } from "@/contract";
import { authEnv } from "@/server/auth/env";
import { ApiFailure, guarded, readJson } from "@/server/auth/errors";
import { requireUser } from "@/server/auth/session";
import { briefCountOf, onboardingFor } from "@/server/auth/views";
import { advanceOnboarding } from "@/server/auth/workspaces";

// GET: the current step. PATCH { step: "first" | "done", skipped? }: moves forward only (tools -> first -> done).
export const GET = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    return Response.json({ onboarding: await onboardingFor(env, await requireUser(request, env)) });
  });

export const PATCH = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    const p = await requireUser(request, env);
    if (!p.workspace) throw new ApiFailure(409, "step_order", "Create your workspace first.");
    const body = PatchOnboardingRequest.parse(await readJson(request));
    const onboarding = await advanceOnboarding(p.db, p.workspace, body.step, body.skipped === true, await briefCountOf(env, p.workspace.id));
    return Response.json({ onboarding });
  });
