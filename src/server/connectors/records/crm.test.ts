import { describe, expect, it } from "vitest";
import { SAMPLE_CLIENT_EMAIL } from "@/mocks/connectors-records";
import { planToDeal, contactName } from "../crm/mapper";
import { markDealApproved, pollHubspot, sendToHubspot } from "../crm/hubspot";
import { harness } from "./harness";

describe("plan -> HubSpot deal mapper", () => {
  const { data } = harness();
  const p = planToDeal(data, "https://wallspace.pages.dev", SAMPLE_CLIENT_EMAIL, "Please confirm by Friday.");
  it("names the deal, sets amount to plan spend and close date to flight start", () => {
    expect(p.deal.dealname).toBe("Porchlight Comedy Tour · Atlanta OOH · Nov 2026");
    expect(p.deal.amount).toBe(String(Math.round(data.plan.spendUsd)));
    expect(p.deal.closedate).toBe("2026-11-16");
    expect(p.deal.pipeline).toBe("default");
    expect(p.deal.dealstage).toBe("appointmentscheduled");
  });
  it("lists faces, chosen copy and the plan link in the note, escaped", () => {
    expect(p.noteHtml).toContain("ATL-0412");
    expect(p.noteHtml).toContain("Little Five laughs louder. Nov 21.");
    expect(p.noteHtml).toContain(`https://wallspace.pages.dev/app/plans/${data.plan.id}`);
    expect(p.noteHtml).toContain("Please confirm by Friday.");
    expect(p.noteHtml).toMatch(/Sample brand/);
  });
  it("strips the sample label from the company name and derives the contact", () => {
    expect(p.company.name).toBe("Porchlight Comedy Tour");
    expect(p.contact).toEqual({ email: SAMPLE_CLIENT_EMAIL, firstname: "Dana", lastname: "Whitfield" });
    expect(contactName("solo@x.example")).toEqual({ firstname: "Solo", lastname: "" });
  });
  it("escapes html in a planner note", () => {
    expect(planToDeal(data, "https://x.example", null, "<script>x</script>").noteHtml).toContain("&lt;script&gt;");
  });
});

describe("HubSpot connector on the mock", () => {
  it("creates company, contact, associated deal and note, and logs it", async () => {
    const { deps, composio, store, data, planId } = harness();
    const res = await sendToHubspot(deps, { ...data, to: SAMPLE_CLIENT_EMAIL });
    expect(res).toMatchObject({ ok: true, provider: "hubspot" });
    expect(res.externalId).toBeTruthy();
    const create = composio.calls.find((c) => c.slug === "HUBSPOT_CREATE_DEAL")!;
    expect(create.args.associations).toHaveLength(2);
    expect(composio.companies.size).toBe(1);
    expect(composio.contacts.size).toBe(1);
    expect(composio.notes).toHaveLength(1);
    const kinds = (await store.getLinks(planId, "hubspot")).map((l) => l.kind).sort();
    expect(kinds).toEqual(["company", "contact", "deal", "note"]);
    expect(store.events.at(-1)?.kind).toBe("deal-created");
  });

  it("re-send updates the same deal and does not duplicate company or contact", async () => {
    const { deps, composio, data } = harness();
    await sendToHubspot(deps, { ...data, to: SAMPLE_CLIENT_EMAIL });
    await sendToHubspot(deps, { ...data, to: SAMPLE_CLIENT_EMAIL });
    expect(composio.deals.size).toBe(1);
    expect(composio.companies.size).toBe(1);
    expect(composio.calls.filter((c) => c.slug === "HUBSPOT_CREATE_DEAL")).toHaveLength(1);
    const upd = composio.calls.find((c) => c.slug === "HUBSPOT_UPDATE_DEAL")!;
    expect(Object.keys(upd.args.properties as object)).not.toContain("dealstage");
  });

  it("reuses an existing HubSpot company of the same name", async () => {
    const { deps, composio, data } = harness();
    composio.companies.set("co-existing", "Porchlight Comedy Tour");
    await sendToHubspot(deps, { ...data });
    expect(composio.calls.some((c) => c.slug === "HUBSPOT_CREATE_COMPANY")).toBe(false);
  });

  it("poll reports a stage change made in HubSpot once, as an inbound event", async () => {
    const { deps, composio, data, store } = harness();
    const { externalId } = await sendToHubspot(deps, { ...data });
    expect((await pollHubspot(deps)).events).toHaveLength(0);
    composio.setDealStage(externalId!, "closedwon");
    const first = await pollHubspot(deps);
    expect(first.events).toHaveLength(1);
    expect(first.events[0]).toMatchObject({ direction: "in", kind: "deal-stage", summary: "HubSpot deal stage: Plan sent to Booked" });
    expect((await pollHubspot(deps)).events).toHaveLength(0);
    expect(store.events.filter((e) => e.direction === "in")).toHaveLength(1);
  });

  it("poll reports an amount edit", async () => {
    const { deps, composio, data } = harness();
    const { externalId } = await sendToHubspot(deps, { ...data });
    composio.deals.get(externalId!)!.props.amount = "30000";
    const r = await pollHubspot(deps);
    expect(r.events[0]).toMatchObject({ kind: "deal-updated" });
  });

  it("approval moves the deal and the next poll does not echo our own write", async () => {
    const { deps, composio, data, planId } = harness();
    const { externalId } = await sendToHubspot(deps, { ...data });
    expect(await markDealApproved(deps, planId)).toBe(true);
    expect(composio.deals.get(externalId!)!.props.dealstage).toBe("decisionmakerboughtin");
    expect((await pollHubspot(deps)).events).toHaveLength(0);
    expect(await markDealApproved({ ...deps }, "plan-without-deal")).toBe(false);
  });

  it("a tool failure is logged as an error event and rethrown", async () => {
    const { deps, composio, data, store } = harness();
    composio.failSlugs.add("HUBSPOT_CREATE_DEAL");
    await expect(sendToHubspot(deps, { ...data })).rejects.toThrow(/HUBSPOT_CREATE_DEAL/);
    expect(store.events.at(-1)).toMatchObject({ kind: "error", ok: false });
  });

  it("a note failure does not fail the send", async () => {
    const { deps, composio, data, store } = harness();
    composio.failSlugs.add("HUBSPOT_CREATE_NOTE");
    await expect(sendToHubspot(deps, { ...data })).resolves.toMatchObject({ ok: true });
    expect(store.events.some((e) => e.kind === "error" && /note/.test(e.summary))).toBe(true);
  });
});
