import { SignInRequest, SignUpRequest } from "@/contract";
import { getAuth } from "./better";
import { authDb } from "./db";
import { googleEnabled, type Env } from "./env";
import { ApiFailure, guarded } from "./errors";
import { allow, SIGN_IN_LIMIT, SIGN_UP_LIMIT } from "./ratelimit";
import { originAllowed } from "./session";

// The only Better Auth endpoints this app exposes. Everything else (change-password, update-user, list-sessions, reset...) answers 404.
const OPEN = new Set(["POST /sign-up/email", "POST /sign-in/email", "POST /sign-in/social", "POST /sign-out", "GET /get-session", "GET /callback/google"]);

const SIGN_UP_FAILED = "We couldn't create that account. Check the details, or sign in if you already have one.";
const SIGN_IN_FAILED = "That email and password don't match.";

const fail = (status: number, code: string, error: string, headers?: Record<string, string>) => Response.json({ error, code }, { status, headers });

/**
 * Better Auth behind guards: per-IP rate limits, zod validation, an allow-list of paths and generic failures. A failed sign-up (taken
 * email included) and a failed sign-in (unknown email and wrong password alike) each return one fixed message, so neither reveals
 * whether an address has an account. Successes pass through untouched so the session cookie reaches the browser.
 */
export async function handleAuth(request: Request, env: Env): Promise<Response> {
  return guarded(async () => {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "") || "/";
    if (!OPEN.has(`${request.method} ${path}`)) throw new ApiFailure(404, "not_found", "Not found.");
    if (request.method === "POST" && !originAllowed(request, env)) throw new ApiFailure(403, "bad_origin", "This request came from another site.");
    const isSignUp = path === "/sign-up/email";
    const isSignIn = path === "/sign-in/email";
    if (path === "/sign-in/social" || path === "/callback/google") {
      if (!googleEnabled(env)) throw new ApiFailure(404, "not_found", "Not found.");
    }

    let forward = request;
    if (isSignUp || isSignIn) {
      if (!(await allow(env, request, isSignUp ? SIGN_UP_LIMIT : SIGN_IN_LIMIT))) {
        return fail(429, "rate_limited", "Too many attempts. Wait a while and try again.", { "retry-after": String((isSignUp ? SIGN_UP_LIMIT : SIGN_IN_LIMIT).windowSec) });
      }
      const body: unknown = await request.clone().json().catch(() => null);
      const parsed = (isSignUp ? SignUpRequest : SignInRequest).safeParse(body);
      if (!parsed.success) return fail(400, "bad_request", isSignUp ? (parsed.error.issues[0]?.message ?? SIGN_UP_FAILED) : SIGN_IN_FAILED);
      forward = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(parsed.data) });
    }

    const res = await getAuth(env, await authDb(env), request).handler(forward);
    if (res.status < 400) return res;
    if (isSignUp) return fail(400, "sign_up_failed", SIGN_UP_FAILED);
    if (isSignIn) return fail(401, "invalid_credentials", SIGN_IN_FAILED);
    return fail(res.status >= 500 ? 500 : res.status, res.status >= 500 ? "internal" : "auth_error", res.status >= 500 ? "Something went wrong. Try again." : "The request could not be completed.");
  });
}
