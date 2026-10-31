// Sample faces: the street, the neighbourhood it must fall in and the face kind. build-faces.mjs picks a spread-out point on the named
// OpenStreetMap street centreline inside that neighbourhood, offsets it to the kerb and names the cross street. Order is the id order (stable).
// owner: p = Peachline Outdoor (sample), s = Southside Signs (sample).
export const SAMPLE_SPEC = [
  // Little Five Points
  { street: "Moreland Avenue", area: "Little Five Points", kind: "bulletin", owner: "p", tier: 0.55 },
  { street: "Moreland Avenue", area: "Little Five Points", kind: "poster", owner: "p", tier: 0.5 },
  { street: "Moreland Avenue", area: "Little Five Points", kind: "bus_shelter", owner: "p", tier: 0.5 },
  { street: "Moreland Avenue", area: "Little Five Points", kind: "kiosk", owner: "p", tier: 0.6 },
  { street: "Euclid Avenue", area: "Little Five Points", kind: "digital_bulletin", owner: "p", tier: 0.6 },
  // East Atlanta Village
  { street: "Flat Shoals Avenue", area: "East Atlanta Village", kind: "poster", owner: "p", tier: 0.5 },
  { street: "Flat Shoals Avenue", area: "East Atlanta Village", kind: "bus_shelter", owner: "p", tier: 0.45 },
  { street: "Moreland Avenue", area: "East Atlanta Village", kind: "bulletin", owner: "p", tier: 0.4 },
  { street: "Flat Shoals Avenue", area: "East Atlanta Village", kind: "kiosk", owner: "p", tier: 0.45 },
  // West End
  { street: "Ralph David Abernathy", area: "West End", kind: "bulletin", owner: "s", tier: 0.3 },
  { street: "Ralph David Abernathy", area: "West End", kind: "poster", owner: "s", tier: 0.25 },
  { street: "Ralph David Abernathy", area: "West End", kind: "bus_shelter", owner: "s", tier: 0.3 },
  { street: "Ralph David Abernathy", area: "West End", kind: "digital_bulletin", owner: "s", tier: 0.3 },
  // Old Fourth Ward
  { street: "Ponce de Leon Avenue", area: "Old Fourth Ward", kind: "digital_bulletin", owner: "p", tier: 0.8 },
  { street: "Ponce de Leon Avenue", area: "Old Fourth Ward", kind: "bus_shelter", owner: "p", tier: 0.7 },
  { street: "Boulevard", area: "Old Fourth Ward", kind: "bulletin", owner: "p", tier: 0.65 },
  { street: "Boulevard", area: "Old Fourth Ward", kind: "poster", owner: "p", tier: 0.6 },
  { street: "Edgewood Avenue", area: "Old Fourth Ward", kind: "kiosk", owner: "p", tier: 0.6 },
  // Inman Park
  { street: "Edgewood Avenue", area: "Inman Park", kind: "poster", owner: "p", tier: 0.65 },
  { street: "DeKalb Avenue", area: "Inman Park", kind: "bulletin", owner: "p", tier: 0.6 },
  { street: "Edgewood Avenue", area: "Inman Park", kind: "bus_shelter", owner: "p", tier: 0.55 },
  // Kirkwood
  { street: "Memorial Drive", area: "Kirkwood", kind: "bulletin", owner: "s", tier: 0.35 },
  { street: "Memorial Drive", area: "Kirkwood", kind: "poster", owner: "s", tier: 0.3 },
  { street: "Memorial Drive", area: "Kirkwood", kind: "bus_shelter", owner: "s", tier: 0.3 },
  // Edgewood
  { street: "Memorial Drive", area: "Edgewood", kind: "bulletin", owner: "s", tier: 0.4 },
  { street: "Moreland Avenue", area: "Edgewood", kind: "poster", owner: "s", tier: 0.35 },
  { street: "Memorial Drive", area: "Edgewood", kind: "kiosk", owner: "s", tier: 0.35 },
  // Grant Park
  { street: "Memorial Drive", area: "Grant Park", kind: "bulletin", owner: "s", tier: 0.45 },
  { street: "Boulevard", area: "Grant Park", kind: "poster", owner: "s", tier: 0.4 },
  { street: "Memorial Drive", area: "Grant Park", kind: "bus_shelter", owner: "s", tier: 0.45 },
  { street: "Boulevard", area: "Grant Park", kind: "digital_bulletin", owner: "s", tier: 0.5 },
  // Reynoldstown
  { street: "Moreland Avenue", area: "Reynoldstown", kind: "bulletin", owner: "p", tier: 0.5 },
  { street: "Memorial Drive", area: "Reynoldstown", kind: "poster", owner: "p", tier: 0.45 },
  { street: "DeKalb Avenue", area: "Reynoldstown", kind: "bus_shelter", owner: "p", tier: 0.45 },
  // Buckhead
  { street: "Peachtree Road", area: "Buckhead", kind: "digital_bulletin", owner: "p", tier: 1 },
  { street: "Peachtree Road", area: "Buckhead", kind: "digital_bulletin", owner: "p", tier: 0.95 },
  { street: "Peachtree Road", area: "Buckhead", kind: "bulletin", owner: "p", tier: 0.9 },
  { street: "Peachtree Road", area: "Buckhead", kind: "poster", owner: "p", tier: 0.85 },
  { street: "Peachtree Road", area: "Buckhead", kind: "bus_shelter", owner: "p", tier: 0.85 },
  { street: "Peachtree Road", area: "Buckhead", kind: "kiosk", owner: "p", tier: 0.9 },
];
