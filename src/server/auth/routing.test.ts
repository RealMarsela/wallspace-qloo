import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { safeNext } from "@/lib/auth-client";
import { SAMPLE_PLAN_ID, SAMPLE_RUN_ID, faceHref, planHref, runHref } from "@/lib/routes";
import { isPublicApi } from "./public-api";

const req = (path: string, init: { method?: string; cookie?: string } = {}) =>
  new NextRequest(`https://wallspace.pages.dev${path}`, { method: init.method ?? "GET", headers: init.cookie ? { cookie: init.cookie } : {} });
const api = (method: string, path: string) => isPublicApi(method, new URL(`https://x${path}`));

describe("middleware: /app needs a session cookie", () => {
  it("redirects a signed-out visitor to /signin?next=<path and query>", () => {
    const res = middleware(req("/app/plans/plan-x?tab=copy"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://wallspace.pages.dev/signin?next=%2Fapp%2Fplans%2Fplan-x%3Ftab%3Dcopy");
  });
  it("lets any session cookie through (the guard and the API decide validity)", () => {
    for (const cookie of ["wallspace.session_token=abc.def", "a=1; __Secure-wallspace.session_token=abc.def"]) {
      expect(middleware(req("/app/new", { cookie }))?.headers.get("x-middleware-next")).toBe("1");
    }
  });
  it("treats an empty or look-alike cookie as no session", () => {
    expect(middleware(req("/app", { cookie: "wallspace.session_token=" })).status).toBe(307);
    expect(middleware(req("/app", { cookie: "x-wallspace.session_token=abc" })).status).toBe(307);
  });
});

describe("middleware: /api data routes answer 401 { error, code } without a cookie", () => {
  it.each([
    ["POST", "/api/briefs"], ["GET", "/api/briefs"], ["POST", "/api/plans"], ["GET", "/api/plans/plan-other"], ["POST", "/api/plans/plan-sample/send"],
    ["POST", "/api/plans/plan-sample/sign-off"], ["GET", "/api/runs/run-other"], ["GET", "/api/connections"], ["POST", "/api/connections/gmail/connect"],
    ["POST", "/api/owner/faces/ATL-0101/pitch"], ["POST", "/api/workspaces"], ["GET", "/api/onboarding"], ["PATCH", "/api/onboarding"], ["GET", "/api/connections/events"],
  ])("%s %s", async (method, path) => {
    const res = middleware(req(path, { method }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in to continue.", code: "unauthorized" });
  });
});

describe("public API allow-list", () => {
  it.each([
    ["POST", "/api/auth/sign-in/email"], ["GET", "/api/auth/callback/google"], ["GET", "/api/me"], ["POST", "/api/guard"], ["GET", "/api/limits"],
    ["POST", "/api/ingest/nemo"], ["GET", "/api/ingest/nemo"], ["POST", "/api/ingest/eval"], ["POST", "/api/connectors/slack/interact"],
    ["POST", "/api/connectors/composio/webhook"], ["GET", "/api/connectors/composio/callback"], ["POST", "/api/connectors/mail/sync"], ["POST", "/api/connectors/records/sync"],
    ["GET", "/api/faces"], ["GET", "/api/faces/ATL-0101"], ["GET", "/api/faces/ATL-0101/photo"], ["GET", "/api/owner/faces/ATL-0101/card"], ["GET", "/api/plans"],
    ["GET", "/api/plans/plan-sample"], ["GET", "/api/plans/plan-sample/export.csv"], ["GET", "/api/plans/plan-sample/export.openooh.json"],
    ["GET", "/api/runs/run-sample"], ["GET", "/api/runs/run-sample/live"], ["GET", "/api/connections/events?planId=plan-sample"],
  ])("open: %s %s", (method, path) => expect(api(method, path)).toBe(true));

  it.each([
    ["POST", "/api/plans"], ["POST", "/api/briefs"], ["GET", "/api/plans/plan-private"], ["POST", "/api/plans/plan-sample/send"], ["POST", "/api/plans/plan-sample/rescan"],
    ["DELETE", "/api/plans/plan-sample"], ["GET", "/api/runs/run-private"], ["POST", "/api/owner/faces/ATL-0101/pitch"], ["GET", "/api/connections"],
    ["GET", "/api/connections/events?planId=plan-private"], ["GET", "/api/connections/events"], ["POST", "/api/faces"], ["GET", "/api/plans/plan-sample-2"],
    ["GET", "/api/ingest/other"], ["GET", "/api/authx"],
  ])("closed: %s %s", (method, path) => expect(api(method, path)).toBe(false));
});

describe("sign-in redirect target", () => {
  it("only honours paths under /app", () => {
    expect(safeNext("/app/plans/plan-x")).toBe("/app/plans/plan-x");
    expect(safeNext("/app")).toBe("/app");
    expect(safeNext("/app/new?x=1")).toBe("/app/new?x=1");
    for (const bad of [null, "", "/", "/sample", "/onboarding", "//evil.example", "https://evil.example", "/app/../x", "/appx", "/\\evil"]) expect(safeNext(bad)).toBe("/app");
  });
});

describe("route helpers keep the sample plan public", () => {
  it("links the sample inside /sample and everything else inside /app", () => {
    expect(planHref(SAMPLE_PLAN_ID)).toBe("/sample");
    expect(faceHref(SAMPLE_PLAN_ID, "ATL-0021")).toBe("/sample/faces/ATL-0021");
    expect(runHref(SAMPLE_RUN_ID)).toBe("/sample/run");
    expect(planHref("plan-abc")).toBe("/app/plans/plan-abc");
    expect(faceHref("plan-abc", "ATL-0021")).toBe("/app/plans/plan-abc/faces/ATL-0021");
    expect(runHref("run-abc")).toBe("/app/runs/run-abc");
  });
});
