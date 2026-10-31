// Offline generator for src/data/faces.json and src/data/atl-neighbourhoods.json. Run by hand, never at build or runtime:
//   node src/data/gen/build-faces.mjs <billboards.geojson> <neighbourhoods.geojson> <overpass-ways.json>
// Inputs: the OSM billboard export (ODbL), the City of Atlanta DPCD Neighborhood layer (GeoJSON, WGS84) and an Overpass dump of
// named trunk/primary/secondary/tertiary ways (`out geom`). Real faces come from OSM; sample faces come from sample-spec.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { SAMPLE_SPEC } from "./sample-spec.mjs";

const [geoPath, hoodPath, waysPath] = process.argv.slice(2);
const geo = JSON.parse(readFileSync(geoPath, "utf8"));
const hoods = JSON.parse(readFileSync(hoodPath, "utf8"));
const ways = JSON.parse(readFileSync(waysPath, "utf8")).elements.filter((e) => e.type === "way" && e.geometry);

const out = (s) => process.stdout.write(`${s}\n`);
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const R = 6371000, rad = Math.PI / 180;
const mx = (lat) => Math.cos(lat * rad) * R * rad, my = R * rad;

// ---- neighbourhoods: point in polygon on the full layer; a simplified copy is written for runtime use
const rings = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
function inRing(ring, x, y) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function hoodAt(lng, lat) {
  for (const f of hoods.features) for (const poly of rings(f.geometry)) {
    if (inRing(poly[0], lng, lat) && !poly.slice(1).some((h) => inRing(h, lng, lat))) return f.properties.NAME;
  }
  return null;
}
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0, dmax = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)) : 0;
    const d = Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
    if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > tol ? [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)] : [a, b];
}
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const simple = hoods.features.map((f) => ({
  n: f.properties.NAME,
  p: rings(f.geometry).map((poly) => poly.map((ring) => { const s = dp(ring, 0.00015).map(([x, y]) => [r4(x), r4(y)]); return s.length >= 4 ? s : ring.map(([x, y]) => [r4(x), r4(y)]); })),
}));
writeFileSync(new URL("../atl-neighbourhoods.json", import.meta.url), `${JSON.stringify({
  source: "City of Atlanta Department of City Planning, Neighborhood layer (public GIS), simplified to about 15 m. Polygons are [outer, ...holes] rings of [lng, lat].",
  hoods: simple.map((s) => ({ name: s.n, polys: s.p })),
})}\n`);

// ---- named street index
const baseName = (n) => n.replace(/ (Northeast|Northwest|Southeast|Southwest)$/, "").replace(/^(East|West|North|South) /, "");
const abbr = (n) => baseName(n).replace(/ Avenue$/, " Ave").replace(/ Boulevard$/, " Blvd").replace(/ Drive$/, " Dr").replace(/ Road$/, " Rd").replace(/ Street$/, " St").replace(/ Parkway$/, " Pkwy").replace(/ Place$/, " Pl").replace(/^Peachtree Road$/, "Peachtree Rd");
const nodeWays = new Map();
for (const w of ways) for (const id of w.nodes) { if (!nodeWays.has(id)) nodeWays.set(id, []); nodeWays.get(id).push(w); }
function snap(lat, lng, pred, maxM = 1e9) {
  let best = null;
  for (const w of ways) {
    if (!pred(w)) continue;
    for (let i = 0; i < w.geometry.length - 1; i++) {
      const a = w.geometry[i], b = w.geometry[i + 1], kx = mx(lat);
      const ax = (a.lon - lng) * kx, ay = (a.lat - lat) * my, bx = (b.lon - lng) * kx, by = (b.lat - lat) * my;
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d < (best?.d ?? maxM)) best = { d, w, i, t, lat: a.lat + t * (b.lat - a.lat), lng: a.lon + t * (b.lon - a.lon), bearing: (Math.atan2(dx, dy) / rad + 360) % 360 };
    }
  }
  return best;
}
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = (deg) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
function crossStreet(s, own) {
  let best = null;
  s.w.geometry.forEach((p, i) => {
    const d = Math.hypot((p.lon - s.lng) * mx(s.lat), (p.lat - s.lat) * my);
    for (const o of nodeWays.get(s.w.nodes[i]) ?? []) {
      if (!o.tags.name || o.tags.name === "Avenue" || baseName(o.tags.name) === baseName(own)) continue;
      if (d < (best?.d ?? 260)) best = { d, name: o.tags.name };
    }
  });
  return best?.name ?? null;
}

// ---- shared rules
const SIZE = { bulletin: [48, 14], digital_bulletin: [48, 14], poster: [22.8, 10.5], bus_shelter: [4, 6], kiosk: [3.5, 6] };
const RATE = { bulletin: [2500, 4500], digital_bulletin: [4000, 8000], poster: [800, 1500], bus_shelter: [400, 900], kiosk: [500, 1000] };
const rate = (kind, tier, key) => { const [lo, hi] = RATE[kind]; const t = Math.max(0, Math.min(1, tier + (hash(key) - 0.5) * 0.3)); return Math.round((lo + (hi - lo) * t) / 50) * 50; };
const BIG = new Set(["Midtown", "Downtown", "Atlantic Station", "Buckhead Village", "Castleberry Hill", "Sweet Auburn"]);
const MID = new Set(["Home Park", "Piedmont Heights", "Ansley Park", "Grant Park", "Marietta Street Artery"]);
const tierOf = (h) => (BIG.has(h) ? 0.85 : MID.has(h) ? 0.5 : 0.2);
// Colloquial districts the official layer lacks (little Five Points sits in Inman Park/Candler Park; the Village is inside East Atlanta).
const DISTRICTS = [
  { name: "Little Five Points", lat: 33.7648, lng: -84.3489, rM: 500 },
  { name: "East Atlanta Village", lat: 33.7397, lng: -84.3443, rM: 600 },
];
function district(lat, lng, official) {
  for (const d of DISTRICTS) if (Math.hypot((lng - d.lng) * mx(lat), (lat - d.lat) * my) <= d.rM) return d.name;
  return official;
}
const owners = { p: "own-peachline", s: "own-southside", taz: "own-taz", lamar: "own-lamar", delta: "own-delta" };

const faces = [];
// ---- real faces: OSM billboards inside the City of Atlanta
const real = geo.features.map((f) => ({ f, hood: hoodAt(...f.geometry.coordinates) })).filter((r) => r.hood)
  .sort((a, b) => Number(a.f.properties.osm_id.split("/")[1]) - Number(b.f.properties.osm_id.split("/")[1]));
real.forEach(({ f, hood }, n) => {
  const [lng, lat] = f.geometry.coordinates, p = f.properties, id = `ATL-${String(n + 1).padStart(4, "0")}`;
  const digital = p.animated === "yes" || /electronic|digital/i.test(p.description ?? "");
  const kind = digital ? "digital_bulletin" : "bulletin";
  const s = snap(lat, lng, () => true, 150);
  const travel = ((s?.bearing ?? 0) + (hash(id) < 0.5 ? 0 : 180)) % 360;
  const owner = /Taz Anderson/.test(p.operator ?? "") ? owners.taz : /Lamar/.test(p.operator ?? "") ? owners.lamar : /Delta/.test(p.operator ?? "") ? owners.delta : hash(`o${id}`) < 0.5 ? owners.p : owners.s;
  const street = s ? abbr(s.w.tags.name) : null;
  faces.push({
    id, name: p.name ?? (street ? `Billboard on ${street}` : `Billboard in ${hood}`), kind, lat, lng, neighbourhood: hood,
    readSide: hash(`r${id}`) < 0.5 ? "left" : "right", facing: compass(travel + 180), widthFt: SIZE[kind][0], heightFt: SIZE[kind][1],
    lit: /^(yes|24\/7)$/.test(p.lit ?? ""), digital, rateMonthUsd: rate(kind, tierOf(hood), id), ownerId: owner,
    photoUrl: null, photoCredit: null, location: "real", osmId: p.osm_id,
  });
});
// ---- sample faces: candidate kerb points on the named street inside the target neighbourhood, spread out greedily
const label = (lat, lng) => { const o = hoodAt(lng, lat); return district(lat, lng, o && /^Buckhead/.test(o) ? "Buckhead" : o); };
const chosen = [];
function candidates(street, area, flip) {
  const list = [];
  for (const w of ways) {
    if (!w.tags.name.startsWith(street)) continue;
    for (let i = 0; i < w.geometry.length - 1; i++) {
      const a = w.geometry[i], b = w.geometry[i + 1];
      for (const t of [0, 0.5]) {
        const lat = a.lat + t * (b.lat - a.lat), lng = a.lon + t * (b.lon - a.lon);
        const bearing = (Math.atan2((b.lon - a.lon) * mx(lat), (b.lat - a.lat) * my) / rad + 360) % 360;
        const side = (bearing + (flip ? 90 : 270)) * rad; // offset 11 m to the right of the direction of travel
        const olat = lat + (Math.cos(side) * 11) / my, olng = lng + (Math.sin(side) * 11) / mx(lat);
        if (label(olat, olng) === area) list.push({ w, lat: olat, lng: olng, bearing });
      }
    }
  }
  return list;
}
const dist = (a, b) => Math.hypot((a.lng - b.lng) * mx(a.lat), (a.lat - b.lat) * my);
SAMPLE_SPEC.forEach((sp, n) => {
  const id = `ATL-${String(101 + n).padStart(4, "0")}`;
  const flip = n % 2 === 0, cands = candidates(sp.street, sp.area, flip);
  if (!cands.length) throw new Error(`no ${sp.street} inside ${sp.area} (${id})`);
  const near = chosen.filter((c) => c.area === sp.area);
  let s = null, bestD = -1;
  for (const c of cands) { // farthest from every face already placed in this area, at least 90 m from any face
    const d = Math.min(...[...chosen, ...faces].map((o) => dist(c, o)), 1e6);
    const dArea = near.length ? Math.min(...near.map((o) => dist(c, o))) : 0;
    const score = near.length ? dArea : -Math.hypot(c.lat - cands[0].lat, c.lng - cands[0].lng) * 0 + (cands.indexOf(c) === Math.floor(cands.length / 2) ? 1 : 0);
    if (d >= 90 && score > bestD) { bestD = score; s = c; }
  }
  if (!s) throw new Error(`no free spot on ${sp.street} in ${sp.area} (${id})`);
  const travel = (s.bearing + (flip ? 0 : 180)) % 360, lat = s.lat, lng = s.lng;
  chosen.push({ lat, lng, area: sp.area });
  const hood = sp.area, official = hoodAt(lng, lat) ?? "?", cross = crossStreet({ ...s, w: s.w, i: 0 }, s.w.tags.name);
  const kind = sp.kind, digital = kind === "digital_bulletin";
  faces.push({
    id, name: `${abbr(s.w.tags.name)}${cross ? ` at ${abbr(cross)}` : ` in ${hood}`}`, kind, lat, lng, neighbourhood: hood,
    readSide: "right", facing: compass(travel + 180), widthFt: SIZE[kind][0], heightFt: SIZE[kind][1],
    lit: digital || kind === "kiosk" || kind === "bus_shelter" || hash(`l${id}`) < 0.5, digital, rateMonthUsd: rate(kind, sp.tier, id),
    ownerId: owners[sp.owner], photoUrl: null, photoCredit: null, location: "sample", osmId: null,
  });
  out(`${id} ${faces.at(-1).name} | ${hood} (official ${official}) ${kind} ${lat.toFixed(5)},${lng.toFixed(5)}`);
});
for (const f of faces) { f.lat = Math.round(f.lat * 1e6) / 1e6; f.lng = Math.round(f.lng * 1e6) / 1e6; }
writeFileSync(new URL("../faces.json", import.meta.url), `[\n${faces.map((f) => JSON.stringify(f)).join(",\n")}\n]\n`);
out(`wrote ${faces.length} faces (${real.length} real, ${SAMPLE_SPEC.length} sample)`);
