import type { Face } from "@/contract";
import { HUBSPOT_PIPELINE, STAGE_ON_SEND, type PlanData } from "@/contract/connectors-records";
import { dealName, flightDates, plainBrand, planUrl } from "../records/dates";
import { escapeHtml, usd } from "../records/util";

export interface DealPayloads {
  company: { name: string; description: string };
  contact: { email: string; firstname: string; lastname: string } | null;
  deal: Record<string, unknown>;
  noteHtml: string;
}

// "dana.whitfield@porchlight.example" -> Dana Whitfield. A single token gives a first name only.
export function contactName(email: string): { firstname: string; lastname: string } {
  const local = (email.split("@")[0] ?? "").replace(/[+].*$/, "");
  const parts = local.split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase());
  return { firstname: parts[0] ?? "Client", lastname: parts.slice(1).join(" ") };
}

function faceLine(f: Face | undefined, rank: number, faceId: string, costUsd: number, copy: string | null): string {
  const where = f ? `${f.name} (${f.neighbourhood}), ${f.widthFt} x ${f.heightFt} ft ${f.kind.replace("_", " ")}` : faceId;
  return `#${rank} ${faceId} ${where}, ${usd(costUsd)}${copy ? `, copy: "${copy}"` : ""}`;
}

export function noteBody(input: PlanData, appUrl: string, note?: string | null): string {
  const { plan, brief, faces } = input;
  const byId = new Map(faces.map((f) => [f.id, f]));
  const items = [...plan.picks].sort((a, b) => a.rank - b.rank).map((p) =>
    `<li>${escapeHtml(faceLine(byId.get(p.faceId), p.rank, p.faceId, p.costUsd, p.copy[p.chosenCopy]?.text ?? null))}</li>`);
  const dates = flightDates(brief.flightStart, brief.flightWeeks);
  return [
    `<p><b>Wallspace plan for ${escapeHtml(plainBrand(brief.brandName))}</b>: ${plan.picks.length} faces, ${usd(plan.spendUsd)} planned of a ${usd(brief.budgetUsd)} budget. `,
    `Flight ${dates.posting} to ${dates.takedown} (${brief.flightWeeks} weeks).</p>`,
    note ? `<p>${escapeHtml(note)}</p>` : "",
    `<ul>${items.join("")}</ul>`,
    `<p>Open the plan: <a href="${planUrl(appUrl, plan.id)}">${planUrl(appUrl, plan.id)}</a></p>`,
    plan.sample || brief.brandSample ? "<p><i>Sample brand, sample faces and sample rates (demonstration data).</i></p>" : "",
  ].join("");
}

export function planToDeal(input: PlanData, appUrl: string, to?: string | null, note?: string | null): DealPayloads {
  const { plan, brief } = input;
  const dates = flightDates(brief.flightStart, brief.flightWeeks);
  const name = dealName(brief.brandName, brief.flightStart);
  const brand = plainBrand(brief.brandName);
  return {
    company: { name: brand, description: `Advertiser planned in Wallspace${brief.brandSample ? " (sample brand)" : ""}.` },
    contact: to ? { email: to, ...contactName(to) } : null,
    deal: {
      dealname: name,
      amount: String(Math.round(plan.spendUsd)),
      closedate: dates.posting,
      pipeline: HUBSPOT_PIPELINE,
      dealstage: STAGE_ON_SEND,
      description: `Wallspace plan ${plan.id}: ${plan.picks.length} faces, flight ${dates.posting} to ${dates.takedown}. ${planUrl(appUrl, plan.id)}`,
    },
    noteHtml: noteBody(input, appUrl, note),
  };
}

// Properties refreshed on a re-send. The stage is left alone: the buyer owns it once the deal exists.
export function dealRefreshProps(deal: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...deal };
  delete rest.dealstage;
  delete rest.pipeline;
  return rest;
}
