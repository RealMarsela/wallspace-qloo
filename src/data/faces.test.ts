import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Face, MediaOwner } from "@/contract/domain";
import { faces, owners } from "./faces";

describe("inventory", () => {
  it("parses against the contract", () => {
    expect(z.array(Face).safeParse(faces).success).toBe(true);
    expect(z.array(MediaOwner).safeParse(owners).success).toBe(true);
  });
  it("has unique, stable-format ids and every owner exists", () => {
    const ids = new Set(faces.map((f) => f.id));
    expect(ids.size).toBe(faces.length);
    expect(faces.every((f) => /^ATL-\d{4}$/.test(f.id))).toBe(true);
    const ownerIds = new Set(owners.map((o) => o.id));
    expect(faces.every((f) => ownerIds.has(f.ownerId))).toBe(true);
    expect(owners.length).toBeGreaterThanOrEqual(4);
    expect(owners.length).toBeLessThanOrEqual(5);
  });
  it("labels real faces with an OSM id and sample faces without one", () => {
    const real = faces.filter((f) => f.location === "real");
    const sample = faces.filter((f) => f.location === "sample");
    expect(real.length).toBe(46);
    expect(sample.length).toBe(40);
    expect(real.every((f) => f.osmId?.startsWith("node/"))).toBe(true);
    expect(sample.every((f) => f.osmId === null)).toBe(true);
  });
  it("keeps every face inside the Atlanta box with sample rates in range by kind", () => {
    const range = { bulletin: [2500, 4500], digital_bulletin: [4000, 8000], poster: [800, 1500], bus_shelter: [400, 900], kiosk: [500, 1000] } as const;
    for (const f of faces) {
      expect(f.lat).toBeGreaterThan(33.6);
      expect(f.lat).toBeLessThan(33.9);
      expect(f.lng).toBeGreaterThan(-84.55);
      expect(f.lng).toBeLessThan(-84.28);
      const [lo, hi] = range[f.kind];
      expect(f.rateMonthUsd).toBeGreaterThanOrEqual(lo);
      expect(f.rateMonthUsd).toBeLessThanOrEqual(hi);
      expect(f.digital).toBe(f.kind === "digital_bulletin");
    }
  });
  it("covers the ten demo neighbourhoods with sample faces and mixes every kind", () => {
    const areas = ["Little Five Points", "East Atlanta Village", "West End", "Old Fourth Ward", "Inman Park", "Kirkwood", "Edgewood", "Grant Park", "Reynoldstown", "Buckhead"];
    for (const a of areas) expect(faces.some((f) => f.location === "sample" && f.neighbourhood === a)).toBe(true);
    expect(new Set(faces.map((f) => f.kind)).size).toBe(5);
  });
  it("uses the standard unit sizes for bulletins, posters and shelters", () => {
    for (const f of faces) {
      if (f.kind === "bulletin" || f.kind === "digital_bulletin") expect([f.widthFt, f.heightFt]).toEqual([48, 14]);
      if (f.kind === "poster") expect([f.widthFt, f.heightFt]).toEqual([22.8, 10.5]);
      if (f.kind === "bus_shelter") expect([f.widthFt, f.heightFt]).toEqual([4, 6]);
    }
  });
});

describe("site photos", () => {
  it("credit author, licence and the Commons page, and say they are illustrative", () => {
    const withPhoto = faces.filter((f) => f.photoUrl);
    expect(withPhoto.length).toBe(6);
    for (const f of withPhoto) {
      expect(f.photoUrl).toBe(`https://wallspace.pages.dev/api/faces/${f.id}/photo`);
      expect(f.photoCredit).toMatch(/^Illustrative photo, not this exact site/);
      expect(f.photoCredit).toMatch(/(CC BY(-SA)? \d\.\d|Public domain)/);
      expect(f.photoCredit).toContain("https://commons.wikimedia.org/wiki/File:");
    }
  });
});
