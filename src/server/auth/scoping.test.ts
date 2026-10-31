import { beforeAll, describe, expect, it } from "vitest";
import { POST as signUpRoute } from "@/app/api/auth/[...all]/route";
import { GET as briefsGet, POST as briefsPost } from "@/app/api/briefs/route";
import { GET as plansGet, POST as plansPost } from "@/app/api/plans/route";
import { GET as planGet } from "@/app/api/plans/[id]/route";
import { GET as csvGet } from "@/app/api/plans/[id]/export.csv/route";
import { POST as signOffPost } from "@/app/api/plans/[id]/sign-off/route";
import { POST as rescanPost } from "@/app/api/plans/[id]/rescan/route";
import { POST as sendPost } from "@/app/api/plans/[id]/send/route";
import { GET as runGet } from "@/app/api/runs/[id]/route";
import { GET as connectionsGet } from "@/app/api/connections/route";
import { POST as connectPost } from "@/app/api/connections/[provider]/connect/route";
import { POST as disconnectPost } from "@/app/api/connections/[provider]/disconnect/route";
import { GET as eventsGet } from "@/app/api/connections/events/route";
import { POST as pitchPost } from "@/app/api/owner/faces/[id]/pitch/route";
import { POST as workspacePost } from "@/app/api/workspaces/route";
import { MemoryStore } from "@/server/connectors/composio/store";
import { scopeStore } from "@/server/connectors/composio/scoped-store";
import { briefBody, briefFixture, cookieOf, planFixture, req, store } from "./test-kit";

beforeAll(() => {
  process.env.STORE_DRIVER = "memory";
  process.env.AUTH_DEV_DB = ":memory:";
});

async function member(email: string, workspace: string): Promise<string> {
  const res = await signUpRoute(req("/api/auth/sign-up/email", { method: "POST", body: { name: "Rowan Pierce", email, password: "correct horse battery" } }));
  const cookie = cookieOf(res);
  await workspacePost(req("/api/workspaces", { method: "POST", cookie, body: { name: workspace, role: "buyer" } }));
  return cookie;
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const prov = (provider: string) => ({ params: Promise.resolve({ provider }) });

describe("writes need a session", () => {
  it.each([
    ["create brief", () => briefsPost(req("/api/briefs", { method: "POST", body: briefBody }))],
    ["list own briefs", () => briefsGet(req("/api/briefs"))],
    ["start plan", () => plansPost(req("/api/plans", { method: "POST", body: { briefId: "b" } }))],
    ["sign off", () => signOffPost(req("/api/plans/p/sign-off", { method: "POST" }), ctx("p"))],
    ["rescan", () => rescanPost(req("/api/plans/p/rescan", { method: "POST" }), ctx("p"))],
    ["send plan", () => sendPost(req("/api/plans/p/send", { method: "POST", body: { provider: "slack" } }), ctx("p"))],
    ["send pitch", () => pitchPost(req("/api/owner/faces/ATL-0101/pitch", { method: "POST", body: { provider: "slack" } }), ctx("ATL-0101"))],
    ["list connections", () => connectionsGet(req("/api/connections"))],
    ["connect", () => connectPost(req("/api/connections/gmail/connect", { method: "POST" }), prov("gmail"))],
    ["disconnect", () => disconnectPost(req("/api/connections/gmail/disconnect", { method: "POST" }), prov("gmail"))],
    ["provider event log", () => eventsGet(req("/api/connections/events?provider=gmail"))],
  ])("%s answers 401 { error, code } signed out", async (_n, call) => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in to continue.", code: "unauthorized" });
  });

  it("a signed-in user without a workspace gets 403 no_workspace", async () => {
    const cookie = cookieOf(await signUpRoute(req("/api/auth/sign-up/email", { method: "POST", body: { name: "Rowan Pierce", email: "noworkspace@harborlight.test", password: "correct horse battery" } })));
    const res = await briefsPost(req("/api/briefs", { method: "POST", cookie, body: briefBody }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("no_workspace");
  });
});

describe("workspace scoping", () => {
  it("briefs, plans and runs of one workspace are 404 to another; the sample plan is open to everyone and read-only", async () => {
    const s = await store();
    const a = await member("a@harborlight.test", "Harbor Light Coffee");
    const b = await member("b@peachtree.test", "Peachtree Records");

    const created = await (await briefsPost(req("/api/briefs", { method: "POST", cookie: a, body: briefBody }))).json();
    const briefId: string = created.brief.id;
    await s.putPlan(planFixture("plan-a", { briefId }));
    await s.assignOwner("plan", "plan-a", (await s.ownerOf("brief", briefId)) as string);
    await s.putRun({ id: "run-plan-a", planId: "plan-a", kind: "plan", status: "done", costUsd: 0, startedAt: "2026-10-30T08:00:00.000Z", endedAt: null });

    await s.putBrief({ ...briefFixture("brief-sample"), brandName: "Porchlight Comedy Tour (sample brand)", brandSample: true });
    await s.putPlan(planFixture("plan-sample", { briefId: "brief-sample", sample: true }));
    await s.assignOwner("plan", "plan-sample", "ws-demo");
    await s.putRun({ id: "run-plan-sample", planId: "plan-sample", kind: "plan", status: "done", costUsd: 0, startedAt: "2026-10-30T08:00:00.000Z", endedAt: null });

    // the owner sees their plan, the other workspace gets 404 on every read and write
    expect((await planGet(req("/api/plans/plan-a", { cookie: a }), ctx("plan-a"))).status).toBe(200);
    expect((await runGet(req("/api/runs/run-plan-a", { cookie: a }), ctx("run-plan-a"))).status).toBe(200);
    for (const [name, call] of [
      ["plan", () => planGet(req("/api/plans/plan-a", { cookie: b }), ctx("plan-a"))],
      ["plan signed out", () => planGet(req("/api/plans/plan-a"), ctx("plan-a"))],
      ["csv", () => csvGet(req("/api/plans/plan-a/export.csv", { cookie: b }), ctx("plan-a"))],
      ["run", () => runGet(req("/api/runs/run-plan-a", { cookie: b }), ctx("run-plan-a"))],
      ["sign-off", () => signOffPost(req("/api/plans/plan-a/sign-off", { method: "POST", cookie: b }), ctx("plan-a"))],
      ["rescan", () => rescanPost(req("/api/plans/plan-a/rescan", { method: "POST", cookie: b }), ctx("plan-a"))],
      ["send", () => sendPost(req("/api/plans/plan-a/send", { method: "POST", cookie: b, body: { provider: "slack" } }), ctx("plan-a"))],
      ["start plan from their brief", () => plansPost(req("/api/plans", { method: "POST", cookie: b, body: { briefId } }))],
    ] as const) {
      const res = await call();
      expect(res.status, name).toBe(404);
      expect((await res.json()).code, name).toBe("not_found");
    }

    // briefs and plan lists are per workspace
    expect((await (await briefsGet(req("/api/briefs", { cookie: b }))).json()).briefs).toEqual([]);
    expect((await (await briefsGet(req("/api/briefs", { cookie: a }))).json()).briefs.map((x: { id: string }) => x.id)).toEqual([briefId]);
    const listB = (await (await plansGet(req("/api/plans", { cookie: b }))).json()).plans.map((p: { id: string }) => p.id);
    expect(listB).toContain("plan-sample");
    expect(listB).not.toContain("plan-a");
    expect((await (await plansGet(req("/api/plans"))).json()).plans.map((p: { id: string }) => p.id)).toEqual(["plan-sample"]);

    // the sample plan: readable signed out and by anyone, never writable
    for (const cookie of [undefined, b]) {
      const r = await planGet(req("/api/plans/plan-sample", { cookie }), ctx("plan-sample"));
      expect(r.status).toBe(200);
      expect((await r.json()).plan.sample).toBe(true);
      expect((await runGet(req("/api/runs/run-plan-sample", { cookie }), ctx("run-plan-sample"))).status).toBe(200);
      expect((await csvGet(req("/api/plans/plan-sample/export.csv", { cookie }), ctx("plan-sample"))).status).toBe(200);
    }
    const w = await signOffPost(req("/api/plans/plan-sample/sign-off", { method: "POST", cookie: b }), ctx("plan-sample"));
    expect(w.status).toBe(403);
    expect((await w.json()).code).toBe("sample_read_only");
    expect((await eventsGet(req("/api/connections/events?planId=plan-sample"))).status).toBe(200);
    expect((await eventsGet(req("/api/connections/events?planId=plan-a", { cookie: b }))).status).toBe(404);
  });
});

describe("connections key on the workspace", () => {
  it("each workspace has its own Composio user id; accounts and events never cross", async () => {
    const raw = new MemoryStore();
    const a = scopeStore(raw, "wallspace-ws_aaaa");
    const b = scopeStore(raw, "wallspace-ws_bbbb");
    const demo = scopeStore(raw, "wallspace-demo");
    await demo.upsertAccount({ provider: "gmail", composioAccountId: "ca_demo", userId: "wallspace-demo", label: "demo", status: "ACTIVE" });
    await a.upsertAccount({ provider: "gmail", composioAccountId: "ca_a", userId: "wallspace-ws_aaaa", label: "a@harborlight.test", status: "ACTIVE" });
    expect((await a.getAccount("gmail"))?.composioAccountId).toBe("ca_a");
    expect(await b.getAccount("gmail")).toBeNull();
    expect((await demo.getAccount("gmail"))?.composioAccountId).toBe("ca_demo"); // the migrated demo record is untouched
    await a.deleteAccount("gmail");
    expect(await a.getAccount("gmail")).toBeNull();
    expect((await demo.getAccount("gmail"))?.composioAccountId).toBe("ca_demo");
    await a.recordEvent({ provider: "gmail", planId: null, direction: "out", kind: "connected", summary: "Gmail connected" });
    expect(await a.listEvents({ limit: 5 })).toHaveLength(1);
    expect(await b.listEvents({ limit: 5 })).toHaveLength(0);
    expect(await a.lastEventAt("gmail")).not.toBeNull();
    expect(await b.lastEventAt("gmail")).toBeNull();
    await a.saveThread({ planId: "pitch-ATL-0101", provider: "gmail", threadId: "t1", messageId: "m1", token: "[WS:pitch-ATL-0101]", recipient: "x@y.test", sentAt: "2026-10-30T08:00:00Z" });
    expect(await a.threadsForPlan("pitch-ATL-0101")).toHaveLength(1);
    expect(await b.threadsForPlan("pitch-ATL-0101")).toHaveLength(0);
    expect(await b.openThreads("gmail", "2026-10-30T00:00:00Z")).toHaveLength(0);
  });
});
