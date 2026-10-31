import { z } from "zod";

// Shape of GET /api/plans/:id/export.openooh.json. A prepared, OpenRTB 2.6-shaped DOOH deal request with
// OpenOOH venue type ids. It is a file for a DSP or SSP that accepts such requests, never a submission.

const Geo = z.object({ lat: z.number(), lon: z.number(), type: z.literal(1), country: z.literal("USA"), city: z.string() });

export const OohBidRequest = z.object({
  id: z.string(),
  at: z.literal(1),
  cur: z.array(z.literal("USD")),
  imp: z.array(z.object({
    id: z.string(),
    pmp: z.object({
      private_auction: z.literal(1),
      deals: z.array(z.object({ id: z.string(), at: z.literal(1), bidfloorcur: z.literal("USD") })), // no bidfloor: monthly rates are not CPMs
    }),
    ext: z.object({
      face: z.object({
        widthFt: z.number(), heightFt: z.number(), lit: z.boolean(), digital: z.boolean(),
        readSide: z.enum(["left", "right"]), facing: z.string(),
      }),
    }),
  })).length(1),
  device: z.object({
    devicetype: z.literal(8), // OpenRTB DeviceType 8 = out-of-home device
    geo: Geo,
    ext: z.object({ dooh: z.object({ venuetypeid: z.number().int(), venuetypelist: z.string() }) }),
  }),
});
export type OohBidRequest = z.infer<typeof OohBidRequest>;

export const OohVenue = z.object({
  faceId: z.string(),
  name: z.string(),
  neighbourhood: z.string(),
  mediaOwner: z.string(),
  venue: z.object({ id: z.number().int(), name: z.string(), parent: z.string(), list: z.string() }),
  geo: z.object({ lat: z.number(), lon: z.number() }),
  size: z.object({ widthFt: z.number(), heightFt: z.number() }),
  illumination: z.enum(["lit", "unlit"]),
  digital: z.boolean(),
  readSide: z.enum(["left", "right"]),
  facing: z.string(),
  rank: z.number().int(),
  affinity: z.number(),
  rateMonthUsd: z.number(),
  plannedCostUsd: z.number(),
  creativeLine: z.string().nullable(),
  provenance: z.object({ location: z.enum(["real", "sample"]), rate: z.literal("sample") }),
});
export type OohVenue = z.infer<typeof OohVenue>;

export const OpenOohDealRequest = z.object({
  format: z.literal("wallspace.openooh-deal-request"),
  generatedAt: z.string(),
  standards: z.object({
    openrtb: z.literal("2.6"),
    openoohVenueTaxonomy: z.string(),
    openoohSource: z.string(),
    carriage: z.literal("device.ext.dooh.venuetypeid and venuetypelist"),
  }),
  status: z.literal("prepared-not-submitted"),
  notice: z.string(),
  campaign: z.object({
    planId: z.string(),
    name: z.string(),
    advertiser: z.object({ name: z.string(), sample: z.boolean() }),
    audience: z.string(),
    flight: z.object({ start: z.string(), end: z.string(), weeks: z.number().int() }),
    budgetUsd: z.number(),
    plannedSpendUsd: z.number(),
    planUrl: z.string(),
  }),
  deal: z.object({
    id: z.string(), name: z.string(), at: z.literal(1), bidfloorcur: z.literal("USD"),
    ext: z.object({ flight: z.object({ start: z.string(), end: z.string() }) }),
  }),
  venues: z.array(OohVenue),
  bidRequests: z.array(OohBidRequest),
});
export type OpenOohDealRequest = z.infer<typeof OpenOohDealRequest>;
