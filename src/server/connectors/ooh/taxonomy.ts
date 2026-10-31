import type { Face } from "@/contract";

// OpenOOH Venue Taxonomy, the subset Wallspace faces use.
// Source: github.com/openooh/venue-taxonomy specification-1.2.json at commit 826bd083 (spec version 1.2.1,
// published 2 Feb 2026), read on 30 Oct 2026. The research page for 1.1 is stale: in 1.2 the grandchildren
// Roadside 30101, Highway 30102 and Spectacular 30103 are DEPRECATED, so no face is ever tagged with them.
export const OPENOOH_VERSION = "1.2.1";
export const OPENOOH_SOURCE = "https://github.com/openooh/venue-taxonomy/blob/826bd083/specification-1.2.md";

export interface VenueType {
  id: number;
  parentId: number;
  name: string;
  path: string; // dotted string value (deprecated carriage, kept for readability only)
}

export const OUTDOOR_PARENT = { id: 3, name: "Outdoor" } as const;

export const VENUE_TYPES: Record<number, VenueType> = {
  301: { id: 301, parentId: 3, name: "Billboard", path: "outdoor.billboard" },
  302: { id: 302, parentId: 3, name: "Urban Panel", path: "outdoor.urban_panel" },
  303: { id: 303, parentId: 3, name: "Bus Shelter", path: "outdoor.bus_shelter" },
  304: { id: 304, parentId: 3, name: "Spectacular", path: "outdoor.spectacular" },
};

// Wallspace face kinds to the single best venue type. Bulletins and posters are roadside billboards (301);
// kiosks are street-furniture urban panels (302); shelters are 303. 304 is for bulletins larger than 14 x 48 ft,
// which no sample face is.
export function venueTypeFor(face: Pick<Face, "kind" | "widthFt" | "heightFt">): VenueType {
  switch (face.kind) {
    case "bus_shelter":
      return VENUE_TYPES[303];
    case "kiosk":
      return VENUE_TYPES[302];
    case "bulletin":
    case "digital_bulletin":
      return face.widthFt > 48 || face.heightFt > 14 ? VENUE_TYPES[304] : VENUE_TYPES[301];
    case "poster":
      return VENUE_TYPES[301];
  }
}

// device.ext.dooh.venuetypelist is the chosen id plus its parent categories, as a comma-separated string.
export function venueTypeList(v: VenueType): string {
  return `${v.parentId},${v.id}`;
}
