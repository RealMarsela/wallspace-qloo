import { describe, expect, it } from "vitest";
import { fakeComposio } from "@/mocks/connectors-comms";
import { ComposioClient, ComposioError } from "./client";

describe("Composio client", () => {
  it("reuses an existing wallspace-* auth config and never creates a second", async () => {
    const f = fakeComposio({ authConfigs: [{ id: "ac_other", name: "another-app-gmail" }, { id: "ac_mine", name: "wallspace-gmail" }] });
    const c = new ComposioClient({ apiKey: "k", fetchImpl: f.fetchImpl });
    expect(await c.ensureAuthConfig("gmail")).toMatchObject({ id: "ac_mine", created: false });
    expect(f.calls.some((x) => x.method === "POST")).toBe(false);
  });

  it("creates wallspace-<toolkit> with managed auth when missing, leaving other configs alone", async () => {
    const f = fakeComposio({ authConfigs: [{ id: "ac_other", name: "another-app-gmail" }] });
    const c = new ComposioClient({ apiKey: "k", fetchImpl: f.fetchImpl });
    const out = await c.ensureAuthConfig("outlook");
    expect(out).toMatchObject({ id: "ac_new", name: "wallspace-outlook", created: true });
    const post = f.calls.find((x) => x.method === "POST");
    expect(post?.body).toEqual({ toolkit: { slug: "outlook" }, auth_config: { type: "use_composio_managed_auth", name: "wallspace-outlook" } });
    expect(f.calls.filter((x) => x.method !== "GET")).toHaveLength(1);
  });

  it("builds a connect link with user id and callback", async () => {
    const f = fakeComposio();
    const c = new ComposioClient({ apiKey: "k", fetchImpl: f.fetchImpl });
    const link = await c.connectLink("gmail", "wallspace-demo", "https://wallspace.pages.dev/api/connectors/composio/callback?provider=gmail");
    expect(link.redirectUrl).toContain("composio.dev");
    expect(f.calls.find((x) => x.url.includes("/connected_accounts/link"))?.body).toMatchObject({ auth_config_id: "ac_new", user_id: "wallspace-demo", callback_url: expect.stringContaining("provider=gmail") });
  });

  it("lists only the demo user's accounts and never exposes tokens", async () => {
    const f = fakeComposio({ accounts: [{ id: "ca_1", toolkit: "gmail" }, { id: "ca_2", toolkit: "gmail", userId: "someone-else" }] });
    const rows = await new ComposioClient({ apiKey: "k", fetchImpl: f.fetchImpl }).listConnectedAccounts({ userId: "wallspace-demo", toolkit: "gmail" });
    expect(rows.map((r) => r.id)).toEqual(["ca_1"]);
    expect(JSON.stringify(rows)).not.toContain("SHOULD-NOT-LEAK");
  });

  it("treats successful:false as an error even on HTTP 200", async () => {
    const f = fakeComposio({ toolSuccessful: false });
    const c = new ComposioClient({ apiKey: "k", fetchImpl: f.fetchImpl });
    await expect(c.executeTool("GMAIL_SEND_EMAIL", "ca_1", "wallspace-demo", {})).rejects.toMatchObject({ code: "tool_failed" });
  });

  it("returns tool data and sends the connected account and user", async () => {
    const f = fakeComposio({ tools: { GMAIL_SEND_EMAIL: { id: "m1", threadId: "t1" } } });
    const out = await new ComposioClient({ apiKey: "k", fetchImpl: f.fetchImpl }).executeTool("GMAIL_SEND_EMAIL", "ca_1", "wallspace-demo", { subject: "x" });
    expect(out.data).toEqual({ id: "m1", threadId: "t1" });
    expect(f.calls[0]).toMatchObject({ method: "POST", url: "/api/v3.1/tools/execute/GMAIL_SEND_EMAIL", body: { connected_account_id: "ca_1", user_id: "wallspace-demo", arguments: { subject: "x" } } });
  });

  it("fails clearly without an API key", async () => {
    await expect(new ComposioClient({}).listConnectedAccounts()).rejects.toBeInstanceOf(ComposioError);
  });
});
