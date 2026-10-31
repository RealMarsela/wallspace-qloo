import { handleAuth } from "@/server/auth/handler";
import { authEnv } from "@/server/auth/env";

// Sign-up, sign-in, Google, sign-out and get-session. Guards and limits live in server/auth/handler.ts.
export const GET = (request: Request) => handleAuth(request, authEnv());
export const POST = (request: Request) => handleAuth(request, authEnv());
