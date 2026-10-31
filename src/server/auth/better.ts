import { betterAuth } from "better-auth";
import type { D1Like } from "../db/bindings";
import { googleEnabled, type Env } from "./env";
import { ApiFailure } from "./errors";
import { hashPassword, verifyPassword } from "./password";

const DEV_SECRET = "wallspace-local-dev-secret-not-for-production";
const cache = new WeakMap<object, Map<string, ReturnType<typeof build>>>();

/** The origin cookies and OAuth callbacks use: the public app URL, except on localhost where the request origin wins. */
export function originOf(request: Request, env: Env): string {
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  return (env.APP_URL || "https://wallspace.pages.dev").replace(/\/$/, "");
}

function build(env: Env, db: D1Like, origin: string) {
  const secret = env.WALLSPACE_AUTH_SECRET || (process.env.NODE_ENV === "production" ? "" : DEV_SECRET);
  if (secret.length < 32) throw new ApiFailure(503, "auth_not_configured", "Accounts are not available right now.");
  return betterAuth({
    appName: "Wallspace",
    baseURL: origin,
    secret,
    database: db as never,
    trustedOrigins: [origin],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: false, // no mail sender exists; limit recorded in the handback
      password: { hash: hashPassword, verify: verifyPassword },
    },
    socialProviders: googleEnabled(env)
      ? { google: { clientId: String(env.WALLSPACE_GOOGLE_CLIENT_ID), clientSecret: String(env.WALLSPACE_GOOGLE_CLIENT_SECRET) } }
      : {},
    onAPIError: { errorURL: "/signin" }, // a failed Google round trip lands on the plain sign-in page with ?error=...
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: false }, // per-IP limits live in ./ratelimit (KV), applied before Better Auth runs
    advanced: {
      cookiePrefix: "wallspace",
      useSecureCookies: origin.startsWith("https://"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
  });
}

/** One Better Auth instance per D1 binding and origin (the binding is per Worker isolate). */
export function getAuth(env: Env, db: D1Like, request: Request) {
  const origin = originOf(request, env);
  const key = `${origin}|${googleEnabled(env)}`;
  let byOrigin = cache.get(db);
  if (!byOrigin) cache.set(db, (byOrigin = new Map()));
  let auth = byOrigin.get(key);
  if (!auth) byOrigin.set(key, (auth = build(env, db, origin)));
  return auth;
}
