// Street geometry: polylines of 90/45-degree segments turned into SVG paths with big rounded corners, plus parallel offsets
// so several lanes run side by side and stay concentric through every bend.

export type Pt = readonly [number, number];

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const len = (v: Pt) => Math.hypot(v[0], v[1]);
const unit = (v: Pt): Pt => {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l];
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Offset a polyline sideways by `d` (positive = left of travel in screen coordinates). Corners meet by miter. */
export function offsetPolyline(pts: readonly Pt[], d: number): Pt[] {
  if (pts.length < 2 || d === 0) return pts.map((p) => [p[0], p[1]] as Pt);
  const normals = pts.slice(1).map((p, i) => {
    const [ux, uy] = unit(sub(p, pts[i]));
    return [uy, -ux] as Pt;
  });
  return pts.map((p, i) => {
    if (i === 0) return [p[0] + normals[0][0] * d, p[1] + normals[0][1] * d] as Pt;
    if (i === pts.length - 1) {
      const n = normals[normals.length - 1];
      return [p[0] + n[0] * d, p[1] + n[1] * d] as Pt;
    }
    const a = normals[i - 1];
    const b = normals[i];
    const m = unit([a[0] + b[0], a[1] + b[1]]);
    const cos = m[0] * a[0] + m[1] * a[1] || 1;
    const k = d / cos;
    return [p[0] + m[0] * k, p[1] + m[1] * k] as Pt;
  });
}

/** Path through the points with each corner rounded by radius r (clamped to half the shorter adjoining segment).
 *  `laneOffset` (the offset used for this lane) grows r on the outside of a bend and shrinks it inside, so lanes stay concentric. */
export function roundedPath(pts: readonly Pt[], r: number, laneOffset = 0): string {
  if (pts.length < 2) return "";
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const a = unit(sub(pts[i - 1], p));
    const b = unit(sub(pts[i + 1], p));
    const cross = a[0] * b[1] - a[1] * b[0];
    const turn = Math.sign(cross); // +1 = right turn in screen space, -1 = left
    const angle = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));
    const rl = Math.max(4, r - laneOffset * turn);
    const cut = Math.min(rl / Math.tan(angle / 2), len(sub(pts[i - 1], p)) / 2, len(sub(pts[i + 1], p)) / 2);
    const s: Pt = [p[0] + a[0] * cut, p[1] + a[1] * cut];
    const e: Pt = [p[0] + b[0] * cut, p[1] + b[1] * cut];
    const radius = cut * Math.tan(angle / 2);
    const sweep = cross > 0 ? 0 : 1;
    d += ` L${r2(s[0])} ${r2(s[1])} A${r2(radius)} ${r2(radius)} 0 0 ${sweep} ${r2(e[0])} ${r2(e[1])}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${r2(last[0])} ${r2(last[1])}`;
}

/** Point at fraction t (0..1) along a polyline, ignoring corner rounding. Used to place stops on a street. */
export function pointAt(pts: readonly Pt[], t: number): Pt {
  const segs = pts.slice(1).map((p, i) => len(sub(p, pts[i])));
  const total = segs.reduce((s, x) => s + x, 0);
  let left = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i]) {
      const u = unit(sub(pts[i + 1], pts[i]));
      return [pts[i][0] + u[0] * left, pts[i][1] + u[1] * left];
    }
    left -= segs[i];
  }
  return pts[pts.length - 1];
}
