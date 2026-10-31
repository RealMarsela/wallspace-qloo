import { beforeAll, describe, expect, it } from "vitest";
import { GET as meRoute } from "@/app/api/me/route";
import { POST as authRoute, GET as authGet } from "@/app/api/auth/[...all]/route";
import { POST as workspaceRoute } from "@/app/api/workspaces/route";
import { GET as onboardingGet, PATCH as onboardingPatch } from "@/app/api/onboarding/route";
import { resetLocalLimits } from "./ratelimit";
import { cookieOf, freshIp, req } from "./test-kit";

beforeAll(() => {
  process.env.STORE_DRIVER = "memory";
  process.env.AUTH_DEV_DB = ":memory:";
});

const signUp = (email: string, password = "correct horse battery", ip = freshIp(), name = "Dana Whitfield") =>
  authRoute(req("/api/auth/sign-up/email", { method: "POST", body: { name, email, password }, ip }));
const signIn = (email: string, password: string, ip = freshIp()) => authRoute(req("/api/auth/sign-in/email", { method: "POST", body: { email, password }, ip }));

describe("sign-up and sign-in", () => {
  it("creates an account, sets an httpOnly SameSite=Lax cookie and /api/me knows the user", async () => {
    const res = await signUp("dana@harborlight.test");
    expect(res.status).toBe(200);
    const set = res.headers.get("set-cookie") ?? "";
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=Lax/i);
    const me = await (await meRoute(req("/api/me", { cookie: cookieOf(res) }))).json();
    expect(me.user.email).toBe("dana@harborlight.test");
    expect(me.workspace).toBeNull();
    expect(me.onboarding.step).toBe("workspace");
  });

  it("signed out, /api/me answers 200 with user null", async () => {
    const res = await meRoute(req("/api/me"));
    expect(res.status).toBe(200);
    expect((await res.json()).user).toBeNull();
  });

  it("rejects bad input with { error, code } and a useful message", async () => {
    const short = await signUp("short@harborlight.test", "tiny");
    expect(short.status).toBe(400);
    expect(await short.json()).toEqual({ error: "Use at least 10 characters.", code: "bad_request" });
    const badEmail = await signUp("not-an-email");
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).code).toBe("bad_request");
    const notJson = await authRoute(new Request("http://localhost:3207/api/auth/sign-up/email", { method: "POST", body: "{", headers: { "x-forwarded-for": freshIp() } }));
    expect(notJson.status).toBe(400);
  });

  it("does not reveal whether an email has an account", async () => {
    await signUp("known@harborlight.test");
    const dup = await signUp("known@harborlight.test");
    expect(dup.status).toBe(400);
    expect(await dup.json()).toEqual({ error: expect.stringContaining("couldn't create"), code: "sign_up_failed" });
    const wrongPw = await signIn("known@harborlight.test", "not the password");
    const unknown = await signIn("nobody@harborlight.test", "not the password");
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrongPw.json()).toEqual(await unknown.json());
    const ok = await signIn("known@harborlight.test", "correct horse battery");
    expect(ok.status).toBe(200);
  });

  it("limits sign-up and sign-in attempts per IP", async () => {
    resetLocalLimits();
    const ip = freshIp();
    const ups = [];
    for (let i = 0; i < 7; i++) ups.push((await signUp(`flood${i}@harborlight.test`, "correct horse battery", ip)).status);
    expect(ups.slice(0, 6)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(ups[6]).toBe(429);
    const ip2 = freshIp();
    const ins = [];
    for (let i = 0; i < 13; i++) ins.push((await signIn("flood0@harborlight.test", "wrong password here", ip2)).status);
    expect(ins.slice(0, 12).every((s) => s === 401)).toBe(true);
    const last = await signIn("flood0@harborlight.test", "correct horse battery", ip2);
    expect(last.status).toBe(429);
    expect((await last.json()).code).toBe("rate_limited");
    expect((await signIn("flood0@harborlight.test", "correct horse battery", freshIp())).status).toBe(200); // another IP is unaffected
  });

  it("exposes only the allow-listed Better Auth endpoints", async () => {
    const res = await authRoute(req("/api/auth/change-password", { method: "POST", body: {} }));
    expect(res.status).toBe(404);
    expect((await authGet(req("/api/auth/list-sessions"))).status).toBe(404);
  });

  it("hides Google until its keys exist", async () => {
    expect((await (await meRoute(req("/api/me"))).json()).providers.google).toBe(false);
    expect((await authRoute(req("/api/auth/sign-in/social", { method: "POST", body: { provider: "google" } }))).status).toBe(404);
    process.env.WALLSPACE_GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.WALLSPACE_GOOGLE_CLIENT_SECRET = "test-client-secret";
    try {
      expect((await (await meRoute(req("/api/me"))).json()).providers.google).toBe(true);
      const start = await authRoute(req("/api/auth/sign-in/social", { method: "POST", body: { provider: "google", callbackURL: "/onboarding" } }));
      expect(start.status).toBe(200);
      const { url } = await start.json();
      expect(url).toContain("accounts.google.com");
      expect(decodeURIComponent(url)).toContain("redirect_uri=http://localhost:3207/api/auth/callback/google");
    } finally {
      delete process.env.WALLSPACE_GOOGLE_CLIENT_ID;
      delete process.env.WALLSPACE_GOOGLE_CLIENT_SECRET;
    }
  });

  it("refuses a state-changing request from another site", async () => {
    const cookie = cookieOf(await signUp("origin@harborlight.test"));
    const res = await workspaceRoute(req("/api/workspaces", { method: "POST", cookie, origin: "https://evil.example", body: { name: "Origin Co", role: "buyer" } }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("bad_origin");
  });
});

describe("workspace and onboarding", () => {
  it("walks workspace -> tools -> first -> done and only moves forward", async () => {
    const cookie = cookieOf(await signUp("flow@harborlight.test"));
    const patch = (body: unknown) => onboardingPatch(req("/api/onboarding", { method: "PATCH", cookie, body }));
    expect((await patch({ step: "first" })).status).toBe(409); // no workspace yet
    const bad = await workspaceRoute(req("/api/workspaces", { method: "POST", cookie, body: { name: "x", role: "buyer" } }));
    expect(bad.status).toBe(400); // name too short
    const created = await workspaceRoute(req("/api/workspaces", { method: "POST", cookie, body: { name: "Harbor Light Coffee", role: "buyer" } }));
    expect(created.status).toBe(201);
    expect((await created.json()).workspace).toMatchObject({ name: "Harbor Light Coffee", role: "buyer", city: "atlanta" });
    expect((await workspaceRoute(req("/api/workspaces", { method: "POST", cookie, body: { name: "Second Co", role: "buyer" } }))).status).toBe(409);
    expect((await patch({ step: "done" })).status).toBe(409); // tools and first not done
    expect((await (await patch({ step: "first", skipped: true })).json()).onboarding).toMatchObject({ step: "first", toolsSkipped: true });
    const early = await patch({ step: "done" });
    expect(early.status).toBe(409); // a buyer needs a first brief or an explicit skip
    expect((await early.json()).code).toBe("brief_needed");
    const done = await (await patch({ step: "done", skipped: true })).json();
    expect(done.onboarding).toMatchObject({ step: "done", firstSkipped: true });
    expect((await patch({ step: "first" })).status).toBe(200); // already past it: no change, no regression
    expect((await (await onboardingGet(req("/api/onboarding", { cookie }))).json()).onboarding.step).toBe("done");
    expect((await patch({ step: "weird" })).status).toBe(400);
  });

  it("onboarding needs a session", async () => {
    expect((await onboardingGet(req("/api/onboarding"))).status).toBe(401);
    expect((await workspaceRoute(req("/api/workspaces", { method: "POST", body: { name: "Ghost Co", role: "buyer" } }))).status).toBe(401);
  });
});
