// SAMPLE DATA: invented brand, faces, rates and scores for the demo; replaced by the API in DATA_MODE=app.
// Positions are plausible Atlanta street corners, but every face, owner and rate here is a labelled sample.
import { z } from "zod";
import { Face, MediaOwner } from "@/contract";

export const sampleOwners: MediaOwner[] = z.array(MediaOwner).parse([
  { id: "own-peachline", name: "Peachline Outdoor (sample)", sample: true },
  { id: "own-southbound", name: "Southbound Signs (sample)", sample: true },
  { id: "own-streetframe", name: "Streetframe Shelters (sample)", sample: true },
]);

type Kind = z.infer<typeof Face>["kind"];
type Facing = z.infer<typeof Face>["facing"];

const SIZE: Record<Kind, { widthFt: number; heightFt: number; digital: boolean }> = {
  bulletin: { widthFt: 48, heightFt: 14, digital: false },
  digital_bulletin: { widthFt: 48, heightFt: 14, digital: true },
  poster: { widthFt: 22.8, heightFt: 10.5, digital: false },
  bus_shelter: { widthFt: 4, heightFt: 6, digital: false },
  kiosk: { widthFt: 3, heightFt: 6, digital: false },
};

type Row = [id: string, name: string, kind: Kind, lat: number, lng: number, hood: string, read: "left" | "right", facing: Facing, lit: boolean, rate: number, owner: string];

const P = "own-peachline";
const S = "own-southbound";
const F = "own-streetframe";

// prettier-ignore
const rows: Row[] = [
  // the eight faces the sample plan picks
  ["ATL-0412", "Moreland Ave at Euclid Ave", "bulletin", 33.7643, -84.3494, "Little Five Points", "right", "N", true, 6200, P],
  ["ATL-0388", "Ponce de Leon Ave at Boulevard", "digital_bulletin", 33.7726, -84.372, "Old Fourth Ward", "left", "E", true, 8400, S],
  ["ATL-0527", "Ralph David Abernathy Blvd at Lee St", "bulletin", 33.7369, -84.4134, "West End", "right", "W", true, 5600, P],
  ["ATL-0603", "Flat Shoals Ave at Glenwood Ave", "bulletin", 33.7404, -84.3456, "East Atlanta Village", "right", "S", true, 5200, S],
  ["ATL-0451", "Edgewood Ave at Whitefoord Ave", "digital_bulletin", 33.7555, -84.3395, "Edgewood", "left", "W", true, 7600, S],
  ["ATL-0719", "Peters St at Walker St", "bulletin", 33.7487, -84.4005, "Castleberry Hill", "right", "NE", false, 4800, P],
  ["ATL-0634", "Hosea L Williams Dr at Howard St", "bus_shelter", 33.7533, -84.3193, "Kirkwood", "right", "S", true, 950, F],
  ["ATL-0662", "Memorial Dr at Moreland Ave", "bus_shelter", 33.7465, -84.3497, "Reynoldstown", "left", "E", true, 850, F],
  // second faces in the hot blocks
  ["ATL-0415", "Euclid Ave at Moreland Ave", "kiosk", 33.7647, -84.3488, "Little Five Points", "left", "W", true, 900, F],
  ["ATL-0392", "Edgewood Ave at Boulevard", "poster", 33.7543, -84.372, "Old Fourth Ward", "right", "N", true, 1800, P],
  ["ATL-0531", "Lee St at Oglethorpe Ave", "bus_shelter", 33.7395, -84.4132, "West End", "right", "S", true, 750, F],
  ["ATL-0607", "Glenwood Ave at Moreland Ave", "kiosk", 33.74, -84.349, "East Atlanta Village", "left", "E", true, 800, F],
  ["ATL-0722", "Northside Dr at Martin Luther King Jr Dr", "poster", 33.7499, -84.4035, "Castleberry Hill", "left", "S", false, 1400, P],
  ["ATL-0665", "Moreland Ave at Wylie St", "poster", 33.748, -84.3496, "Reynoldstown", "right", "N", true, 1500, S],
  // the wider city
  ["ATL-0430", "Euclid Ave at Elizabeth St", "poster", 33.7591, -84.3549, "Inman Park", "right", "NW", true, 1700, P],
  ["ATL-0436", "DeKalb Ave at Krog St", "bulletin", 33.7535, -84.364, "Inman Park", "left", "W", true, 5900, S],
  ["ATL-0301", "Peachtree St at 10th St", "digital_bulletin", 33.7812, -84.3838, "Midtown", "right", "S", true, 8900, S],
  ["ATL-0305", "Spring St at 14th St", "bulletin", 33.7864, -84.3893, "Midtown", "left", "N", true, 7200, P],
  ["ATL-0309", "West Peachtree St at 5th St", "kiosk", 33.7768, -84.3876, "Midtown", "right", "E", true, 1150, F],
  ["ATL-0312", "Juniper St at Ponce de Leon Ave", "bus_shelter", 33.7726, -84.382, "Midtown", "left", "S", true, 1000, F],
  ["ATL-0210", "Peachtree Center Ave at Andrew Young Intl Blvd", "digital_bulletin", 33.7593, -84.386, "Downtown", "left", "N", true, 8600, S],
  ["ATL-0214", "Marietta St at Centennial Olympic Park Dr", "kiosk", 33.7577, -84.3943, "Downtown", "right", "W", true, 1200, F],
  ["ATL-0571", "Boulevard at Atlanta Ave", "bus_shelter", 33.734, -84.3693, "Grant Park", "right", "N", true, 700, F],
  ["ATL-0575", "Cherokee Ave at Glenwood Ave", "poster", 33.7375, -84.372, "Grant Park", "left", "E", false, 1300, P],
  ["ATL-0441", "McLendon Ave at Clifton Rd", "poster", 33.7655, -84.3354, "Candler Park", "right", "W", true, 1600, S],
  ["ATL-0448", "Carroll St at Wylie St", "poster", 33.7493, -84.3615, "Cabbagetown", "left", "S", false, 1250, P],
  ["ATL-0541", "Ralph David Abernathy Blvd at Westview Dr", "bus_shelter", 33.7375, -84.428, "Westview", "right", "E", true, 650, F],
  ["ATL-0545", "Lucile Ave at Westview Dr", "poster", 33.743, -84.426, "Westview", "left", "N", false, 1200, P],
  ["ATL-0102", "Peachtree Rd at Lenox Rd", "digital_bulletin", 33.8459, -84.3627, "Buckhead", "right", "S", true, 9000, S],
  ["ATL-0106", "Peachtree Rd at East Paces Ferry Rd", "bulletin", 33.8396, -84.3797, "Buckhead", "left", "N", true, 7500, P],
  ["ATL-0109", "Peachtree Rd at Pharr Rd", "bus_shelter", 33.8341, -84.3802, "Buckhead", "right", "S", true, 1100, F],
  ["ATL-0113", "Roswell Rd at West Paces Ferry Rd", "poster", 33.8434, -84.379, "Buckhead", "left", "E", true, 2200, S],
  ["ATL-0352", "North Highland Ave at Virginia Ave", "poster", 33.7816, -84.3537, "Virginia-Highland", "right", "S", true, 1900, P],
  ["ATL-0356", "Ponce de Leon Ave at North Highland Ave", "bulletin", 33.7727, -84.3545, "Poncey-Highland", "left", "W", true, 6400, S],
  ["ATL-0580", "Georgia Ave at Hank Aaron Dr", "bus_shelter", 33.7388, -84.388, "Summerhill", "right", "W", true, 800, F],
  ["ATL-0251", "17th St at Atlantic Dr", "digital_bulletin", 33.792, -84.3964, "Atlantic Station", "left", "E", true, 7800, S],
];

export const sampleFaces: Face[] = z.array(Face).parse(
  rows.map(([id, name, kind, lat, lng, neighbourhood, readSide, facing, lit, rateMonthUsd, ownerId]) => ({
    id, name, kind, lat, lng, neighbourhood, readSide, facing, lit, rateMonthUsd, ownerId,
    ...SIZE[kind],
    photoUrl: null,
    photoCredit: null,
    location: "sample",
    osmId: null,
  })),
);
