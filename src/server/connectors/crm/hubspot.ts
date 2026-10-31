import {
  HUBSPOT_STAGES, RECORD_TOOLS as T, STAGE_ON_APPROVE, type PlanData, type RecordLink, type RecordsSendInput, type SendResult,
} from "@/contract/connectors-records";
import type { RecordsDeps } from "../records/types";
import { ID_PATHS, errorMessage, firstString, get, logEvent, run, saveLink } from "../records/util";
import { dealRefreshProps, planToDeal } from "./mapper";

const P = "hubspot" as const;
// HubSpot-defined association type ids: deal->contact 3, deal->company 5, note->contact 202, note->company 190, note->deal 214.
const assoc = (id: string, typeId: number) => ({ to: { id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: typeId }] });

export const stageLabel = (stage: string | null): string => (stage && stage in HUBSPOT_STAGES ? HUBSPOT_STAGES[stage as keyof typeof HUBSPOT_STAGES] : (stage ?? "unknown"));

function linkOf(links: RecordLink[], kind: RecordLink["kind"]): RecordLink | undefined {
  return links.find((l) => l.kind === kind);
}

async function ensureCompany(deps: RecordsDeps, planId: string, name: string, description: string, links: RecordLink[]): Promise<string> {
  const known = linkOf(links, "company");
  if (known) return known.externalId;
  const found = await run(deps, T.hubspotSearchCompanies, {
    filterGroups: [{ filters: [{ propertyName: "name", operator: "EQ", value: name }] }], properties: ["name"], limit: 1,
  }, P);
  let id = firstString(found.data, [["results", 0, "id"]]);
  if (!id) id = firstString((await run(deps, T.hubspotCreateCompany, { name, description }, P)).data, ID_PATHS);
  if (!id) throw new Error("HubSpot returned no company id");
  await saveLink(deps, { planId, provider: P, kind: "company", externalId: id });
  return id;
}

async function ensureContact(deps: RecordsDeps, planId: string, c: { email: string; firstname: string; lastname: string }): Promise<string> {
  const res = await run(deps, T.hubspotUpsertContacts, {
    inputs: [{ id: c.email, idProperty: "email", properties: { email: c.email, firstname: c.firstname, lastname: c.lastname } }],
  }, P);
  const id = firstString(res.data, ID_PATHS);
  if (!id) throw new Error("HubSpot returned no contact id");
  await saveLink(deps, { planId, provider: P, kind: "contact", externalId: id });
  return id;
}

async function readDeal(deps: RecordsDeps, dealId: string): Promise<{ url: string | null; stage: string | null; amount: string | null; closedate: string | null; name: string | null }> {
  const res = await run(deps, T.hubspotGetDeal, { dealId, properties: ["dealname", "dealstage", "amount", "closedate"] }, P);
  const prop = (k: string) => firstString(res.data, [["properties", k]]);
  return { url: firstString(res.data, [["url"]]), stage: prop("dealstage"), amount: prop("amount"), closedate: prop("closedate"), name: prop("dealname") };
}

// Send / approve: upsert company and contact, create (or refresh) the deal, attach a note listing faces, copy and plan link.
export async function sendToHubspot(deps: RecordsDeps, input: PlanData & Pick<RecordsSendInput, "to" | "note">): Promise<SendResult> {
  const planId = input.plan.id;
  const pay = planToDeal(input, deps.appUrl, input.to, input.note);
  try {
    const links = await deps.store.getLinks(planId, P);
    const companyId = await ensureCompany(deps, planId, pay.company.name, pay.company.description, links);
    const contactId = pay.contact ? await ensureContact(deps, planId, pay.contact) : null;
    const existing = linkOf(links, "deal");
    let dealId: string;
    if (existing) {
      dealId = existing.externalId;
      await run(deps, T.hubspotUpdateDeal, { dealId, properties: dealRefreshProps(pay.deal) }, P);
    } else {
      const associations = [assoc(companyId, 5), ...(contactId ? [assoc(contactId, 3)] : [])];
      const created = await run(deps, T.hubspotCreateDeal, { ...pay.deal, associations }, P);
      const id = firstString(created.data, ID_PATHS);
      if (!id) throw new Error("HubSpot returned no deal id");
      dealId = id;
    }
    const state = await readDeal(deps, dealId);
    await saveLink(deps, { planId, provider: P, kind: "deal", externalId: dealId, url: state.url, snapshot: { dealstage: state.stage, amount: state.amount, closedate: state.closedate } });
    await logEvent(deps, {
      planId, provider: P, direction: "out", kind: existing ? "deal-updated" : "deal-created",
      summary: `${existing ? "Updated" : "Created"} HubSpot deal "${String(pay.deal.dealname)}" at ${stageLabel(state.stage)}`,
      detail: { dealId, companyId, contactId, url: state.url },
    });
    await addNote(deps, planId, dealId, contactId, companyId, pay.noteHtml);
    return { ok: true, provider: P, externalId: dealId, url: state.url };
  } catch (e) {
    await logEvent(deps, { planId, provider: P, direction: "out", kind: "error", summary: `HubSpot send failed: ${errorMessage(e)}`, ok: false });
    throw e;
  }
}

async function addNote(deps: RecordsDeps, planId: string, dealId: string, contactId: string | null, companyId: string, html: string): Promise<void> {
  try {
    const res = await run(deps, T.hubspotCreateNote, {
      hs_timestamp: (deps.now ? deps.now() : new Date()).toISOString(), hs_note_body: html,
      associations: [assoc(dealId, 214), assoc(companyId, 190), ...(contactId ? [assoc(contactId, 202)] : [])],
    }, P);
    const noteId = firstString(res.data, ID_PATHS);
    if (noteId) await saveLink(deps, { planId, provider: P, kind: "note", externalId: noteId });
  } catch (e) {
    // The deal is the record; a note that fails to attach is logged, not fatal.
    await logEvent(deps, { planId, provider: P, direction: "out", kind: "error", summary: `HubSpot note failed: ${errorMessage(e)}`, ok: false });
  }
}

// The client approved the plan in Wallspace: move the deal to the approval stage and keep the snapshot in step,
// so the next poll does not report our own write as an inbound change.
export async function markDealApproved(deps: RecordsDeps, planId: string): Promise<boolean> {
  const deal = linkOf(await deps.store.getLinks(planId, P), "deal");
  if (!deal) return false;
  await run(deps, T.hubspotUpdateDeal, { dealId: deal.externalId, properties: { dealstage: STAGE_ON_APPROVE } }, P);
  await saveLink(deps, { planId, provider: P, kind: "deal", externalId: deal.externalId, url: deal.url, snapshot: { ...(deal.snapshot ?? {}), dealstage: STAGE_ON_APPROVE } });
  await logEvent(deps, { planId, provider: P, direction: "out", kind: "deal-stage", summary: `Moved HubSpot deal to ${stageLabel(STAGE_ON_APPROVE)}`, detail: { dealId: deal.externalId } });
  return true;
}

// Cron read-back: one GET_DEAL per linked deal; a changed stage or amount becomes an inbound event.
export async function pollHubspot(deps: RecordsDeps): Promise<{ checked: number; events: Awaited<ReturnType<typeof logEvent>>[]; errors: string[] }> {
  const events: Awaited<ReturnType<typeof logEvent>>[] = [];
  const errors: string[] = [];
  const deals = (await deps.store.linksByProvider(P)).filter((l) => l.kind === "deal");
  for (const deal of deals) {
    try {
      const cur = await readDeal(deps, deal.externalId);
      const prev = deal.snapshot ?? {};
      const changes: string[] = [];
      if (cur.stage !== get(prev, ["dealstage"])) {
        events.push(await logEvent(deps, {
          planId: deal.planId, provider: P, direction: "in", kind: "deal-stage",
          summary: `HubSpot deal stage: ${stageLabel(String(get(prev, ["dealstage"]) ?? "")) } to ${stageLabel(cur.stage)}`,
          detail: { dealId: deal.externalId, from: get(prev, ["dealstage"]) ?? null, to: cur.stage },
        }));
        changes.push("stage");
      }
      if (cur.amount !== get(prev, ["amount"])) {
        events.push(await logEvent(deps, {
          planId: deal.planId, provider: P, direction: "in", kind: "deal-updated",
          summary: `HubSpot deal amount changed to $${cur.amount ?? "?"}`,
          detail: { dealId: deal.externalId, from: get(prev, ["amount"]) ?? null, to: cur.amount },
        }));
        changes.push("amount");
      }
      if (changes.length || cur.url !== deal.url) {
        await saveLink(deps, { planId: deal.planId, provider: P, kind: "deal", externalId: deal.externalId, url: cur.url ?? deal.url, snapshot: { dealstage: cur.stage, amount: cur.amount, closedate: cur.closedate } });
      }
    } catch (e) {
      errors.push(`hubspot deal ${deal.externalId}: ${errorMessage(e)}`);
    }
  }
  return { checked: deals.length, events, errors };
}
