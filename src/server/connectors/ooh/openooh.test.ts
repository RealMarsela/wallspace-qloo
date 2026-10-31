import { describe, expect, it } from "vitest";
import { sampleRecordsPlan } from "@/mocks/connectors-records";
import { planToOpenOoh } from "./openooh";
import { OpenOohDealRequest } from "./schema";
import { VENUE_TYPES, venueTypeFor, venueTypeList } from "./taxonomy";

const NOW = new Date("2026-10-30T09:00:00.000Z");
const doc = () => planToOpenOoh({ ...sampleRecordsPlan, appUrl: "https://wallspace.pages.dev", now: NOW });

describe("OpenOOH deal request export", () => {
  it("produces a document that parses against its own schema", () => {
    expect(() => OpenOohDealRequest.parse(doc())).not.toThrow();
  });

  it("is honest: prepared, not submitted, with the current taxonomy version", () => {
    const d = doc();
    expect(d.status).toBe("prepared-not-submitted");
    expect(d.notice).toMatch(/not been submitted/);
    expect(d.standards.openrtb).toBe("2.6");
    expect(d.standards.openoohVenueTaxonomy).toBe("1.2.1");
  });

  it("carries one venue and one OpenRTB-shaped bid request per pick, in rank order", () => {
    const d = doc();
    const n = sampleRecordsPlan.plan.picks.length;
    expect(d.venues).toHaveLength(n);
    expect(d.bidRequests).toHaveLength(n);
    expect(d.venues.map((v) => v.rank)).toEqual([...d.venues.map((v) => v.rank)].sort((a, b) => a - b));
    for (const [i, br] of d.bidRequests.entries()) {
      expect(br.device.devicetype).toBe(8);
      expect(br.device.geo.lat).toBe(d.venues[i].geo.lat);
      expect(br.device.ext.dooh.venuetypelist).toBe(d.venues[i].venue.list);
      expect(br.imp[0].pmp.deals[0].id).toBe(d.deal.id);
    }
  });

  it("tags venue types from the 1.2 taxonomy and never a deprecated grandchild", () => {
    const d = doc();
    for (const v of d.venues) {
      expect([301, 302, 303, 304]).toContain(v.venue.id);
      expect(v.venue.list).toBe(`3,${v.venue.id}`);
      expect([30101, 30102, 30103]).not.toContain(v.venue.id);
    }
    const kinds = new Map(sampleRecordsPlan.faces.map((f) => [f.id, f.kind]));
    for (const v of d.venues) {
      const kind = kinds.get(v.faceId);
      if (kind === "bus_shelter") expect(v.venue.id).toBe(303);
      if (kind === "bulletin" || kind === "digital_bulletin") expect(v.venue.id).toBe(301);
    }
  });

  it("maps kinds: shelter 303, kiosk 302, 48x14 bulletin 301, oversize bulletin 304", () => {
    expect(venueTypeFor({ kind: "bus_shelter", widthFt: 4, heightFt: 6 }).id).toBe(303);
    expect(venueTypeFor({ kind: "kiosk", widthFt: 3, heightFt: 6 }).id).toBe(302);
    expect(venueTypeFor({ kind: "bulletin", widthFt: 48, heightFt: 14 }).id).toBe(301);
    expect(venueTypeFor({ kind: "digital_bulletin", widthFt: 60, heightFt: 20 }).id).toBe(304);
    expect(venueTypeList(VENUE_TYPES[303])).toBe("3,303");
  });

  it("states flight dates, size, illumination and sample provenance", () => {
    const d = doc();
    expect(d.campaign.flight).toEqual({ start: "2026-11-16", end: "2026-12-14", weeks: 4 });
    expect(d.campaign.name).toBe("Porchlight Comedy Tour · Atlanta OOH · Nov 2026");
    expect(d.campaign.advertiser.sample).toBe(true);
    const bulletin = d.venues.find((v) => v.size.widthFt === 48);
    expect(bulletin?.size.heightFt).toBe(14);
    expect(d.venues.every((v) => v.provenance.rate === "sample")).toBe(true);
    expect(d.venues.some((v) => v.illumination === "lit")).toBe(true);
  });

  it("does not put a monthly rate in a bid floor", () => {
    expect(JSON.stringify(doc().bidRequests)).not.toContain("bidfloor\":");
  });

  it("rejects a malformed document", () => {
    const bad = { ...doc(), status: "submitted" };
    expect(OpenOohDealRequest.safeParse(bad).success).toBe(false);
  });
});
