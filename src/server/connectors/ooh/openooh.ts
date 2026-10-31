import type { Face } from "@/contract";
import type { PlanData } from "@/contract/connectors-records";
import { dealName, flightDates, planUrl } from "../records/dates";
import { OpenOohDealRequest, type OohBidRequest, type OohVenue } from "./schema";
import { OPENOOH_SOURCE, OPENOOH_VERSION, OUTDOOR_PARENT, venueTypeFor, venueTypeList } from "./taxonomy";

export interface OpenOohInput extends PlanData {
  appUrl: string;
  now?: Date;
  ownerNames?: Record<string, string>; // ownerId -> display name
}

const NOTICE =
  "Prepared export for a DSP or SSP that accepts OpenRTB 2.6 DOOH deal requests tagged with the OpenOOH venue taxonomy. " +
  "It has not been submitted to any exchange. Faces marked sample are demonstration inventory and rates.";

// Plan -> OpenRTB 2.6-shaped DOOH deal request. Pure: the same plan always yields the same document apart from generatedAt.
export function planToOpenOoh(input: OpenOohInput): OpenOohDealRequest {
  const { plan, brief, faces, appUrl } = input;
  const byId = new Map<string, Face>(faces.map((f) => [f.id, f]));
  const dates = flightDates(brief.flightStart, brief.flightWeeks);
  const name = dealName(brief.brandName, brief.flightStart);
  const dealId = `wallspace-${plan.id}`;
  const venues: OohVenue[] = [];
  const bidRequests: OohBidRequest[] = [];

  for (const pick of [...plan.picks].sort((a, b) => a.rank - b.rank)) {
    const face = byId.get(pick.faceId);
    if (!face) continue;
    const vt = venueTypeFor(face);
    const list = venueTypeList(vt);
    const line = pick.copy[pick.chosenCopy]?.text ?? null;
    venues.push({
      faceId: face.id,
      name: face.name,
      neighbourhood: face.neighbourhood,
      mediaOwner: input.ownerNames?.[face.ownerId] ?? face.ownerId,
      venue: { id: vt.id, name: vt.name, parent: OUTDOOR_PARENT.name, list },
      geo: { lat: face.lat, lon: face.lng },
      size: { widthFt: face.widthFt, heightFt: face.heightFt },
      illumination: face.lit ? "lit" : "unlit",
      digital: face.digital,
      readSide: face.readSide,
      facing: face.facing,
      rank: pick.rank,
      affinity: pick.affinity,
      rateMonthUsd: face.rateMonthUsd,
      plannedCostUsd: pick.costUsd,
      creativeLine: line,
      provenance: { location: face.location, rate: "sample" },
    });
    bidRequests.push({
      id: `${dealId}-${face.id}`,
      at: 1,
      cur: ["USD"],
      imp: [{
        id: "1",
        pmp: { private_auction: 1, deals: [{ id: dealId, at: 1, bidfloorcur: "USD" }] },
        ext: { face: { widthFt: face.widthFt, heightFt: face.heightFt, lit: face.lit, digital: face.digital, readSide: face.readSide, facing: face.facing } },
      }],
      device: {
        devicetype: 8,
        geo: { lat: face.lat, lon: face.lng, type: 1, country: "USA", city: "Atlanta" },
        ext: { dooh: { venuetypeid: vt.id, venuetypelist: list } },
      },
    });
  }

  return OpenOohDealRequest.parse({
    format: "wallspace.openooh-deal-request",
    generatedAt: (input.now ?? new Date()).toISOString(),
    standards: {
      openrtb: "2.6",
      openoohVenueTaxonomy: OPENOOH_VERSION,
      openoohSource: OPENOOH_SOURCE,
      carriage: "device.ext.dooh.venuetypeid and venuetypelist",
    },
    status: "prepared-not-submitted",
    notice: NOTICE,
    campaign: {
      planId: plan.id,
      name,
      advertiser: { name: brief.brandName, sample: brief.brandSample },
      audience: brief.audienceText,
      flight: { start: dates.posting, end: dates.takedown, weeks: brief.flightWeeks },
      budgetUsd: brief.budgetUsd,
      plannedSpendUsd: plan.spendUsd,
      planUrl: planUrl(appUrl, plan.id),
    },
    deal: { id: dealId, name, at: 1, bidfloorcur: "USD", ext: { flight: { start: dates.posting, end: dates.takedown } } },
    venues,
    bidRequests,
  });
}
