const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let [latLo, latHi, lngLo, lngHi] = [-90, 90, -180, 180];
  let hash = "", bits = 0, bit = 0, even = true;
  while (hash.length < precision) {
    const range = even ? [lngLo, lngHi] : [latLo, latHi];
    const mid = (range[0] + range[1]) / 2;
    const v = even ? lng : lat;
    bit <<= 1;
    if (v >= mid) { bit |= 1; if (even) lngLo = mid; else latLo = mid; } else if (even) lngHi = mid; else latHi = mid;
    even = !even;
    if (++bits === 5) { hash += B32[bit]; bits = 0; bit = 0; }
  }
  return hash;
}

/** Centre of a geohash cell. */
export function decodeGeohash(hash: string): { lat: number; lng: number } {
  let [latLo, latHi, lngLo, lngHi] = [-90, 90, -180, 180];
  let even = true;
  for (const c of hash) {
    const idx = B32.indexOf(c);
    if (idx < 0) throw new Error(`bad geohash ${hash}`);
    for (let b = 4; b >= 0; b--) {
      const on = (idx >> b) & 1;
      if (even) { const mid = (lngLo + lngHi) / 2; if (on) lngLo = mid; else lngHi = mid; }
      else { const mid = (latLo + latHi) / 2; if (on) latLo = mid; else latHi = mid; }
      even = !even;
    }
  }
  return { lat: (latLo + latHi) / 2, lng: (lngLo + lngHi) / 2 };
}
