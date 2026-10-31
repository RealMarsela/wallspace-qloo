import { authEnv } from "@/server/auth/env";
import { guarded } from "@/server/auth/errors";
import { principalOf } from "@/server/auth/session";
import { meFor } from "@/server/auth/views";

// Who is signed in, their workspace and onboarding step. Signed out answers 200 with user: null so any page can ask.
export const GET = (request: Request) =>
  guarded(async () => {
    const env = authEnv();
    return Response.json(await meFor(env, await principalOf(request, env)), { headers: { "cache-control": "no-store" } });
  });
