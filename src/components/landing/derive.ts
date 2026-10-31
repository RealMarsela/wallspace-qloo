// Pure views of the sample plan and its run for the landing page. Every number shown on / comes through here from the
// app's own API (or the labelled mock data in mock mode); nothing is typed in by hand.
import type { PlanData, RunData } from "@/lib/api-client";

export type Lift = { tag: string; lift: string | null };

const LIFT = /over-indexes on (.+?) \(([\d.]+x) vs Atlanta\)/i;
const PLAIN = /over-indexes on (.+)$/i;

/** "over-indexes on Lively (4x vs Atlanta)" -> { tag: "Lively", lift: "4x" }; */
export function parseLift(label: string): Lift | null {
  const m = LIFT.exec(label);
  if (m) return { tag: m[1], lift: m[2] ?? null };
  const p = PLAIN.exec(label);
  return p ? { tag: p[1], lift: null } : null;
}

export interface PickRow {
  rank: number;
  faceId: string;
  name: string;
  neighbourhood: string;
  kind: string;
  costUsd: number;
  weeklyUsd: number;
  affinity: number;
  lifts: Lift[];
  line: string;
  lines: { text: string; guard: string; nemo: string | null }[];
  guard: string;
  nemoPass: boolean;
  review: { status: string; note: string | null };
  locationReal: boolean;
}

export function pickRows(d: PlanData): PickRow[] {
  const faces = new Map(d.faces.map((f) => [f.id, f]));
  const weeks = d.brief.flightWeeks || 1;
  return [...d.plan.picks]
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const f = faces.get(p.faceId);
      const chosen = p.copy[p.chosenCopy] ?? p.copy[0];
      const lifts = p.evidence.filter((e) => e.kind === "qloo-tag").map((e) => parseLift(e.label)).filter((x): x is Lift => x !== null);
      return {
        rank: p.rank,
        faceId: p.faceId,
        name: f?.name ?? p.faceId,
        neighbourhood: f?.neighbourhood ?? "Atlanta",
        kind: f?.kind ?? "bulletin",
        costUsd: p.costUsd,
        weeklyUsd: Math.round(p.costUsd / weeks),
        affinity: p.affinity,
        lifts: lifts.length ? lifts : p.topTags.map((t) => ({ tag: t, lift: null })),
        line: chosen?.text ?? "",
        lines: p.copy.map((c) => ({ text: c.text, guard: c.guard.status, nemo: c.nemo?.status ?? null })),
        guard: chosen?.guard.status ?? "pass",
        nemoPass: chosen?.nemo?.status === "pass",
        review: p.review,
        locationReal: f?.location === "real",
      };
    });
}

export interface PhotoRead {
  faceId: string;
  sightline: string;
  clutter: string;
  share: number | null;
  note: string;
  dropped: boolean;
  model: string | null;
  ms: number;
  costUsd: number | null;
}

/** Site-photo reads from the run log, with the face the read dropped (if any) first. */
export function photoReads(run: RunData["run"]): PhotoRead[] {
  return run.steps
    .filter((s) => /read (?:the )?site photo/i.test(s.title) && s.status === "ok")
    .map((s) => {
      const id = /ATL-\d+/.exec(s.title)?.[0] ?? /ATL-\d+/.exec(s.summary)?.[0] ?? "face";
      const text = s.summary.replace(`${id}: `, "");
      const share = /fills (?:only )?(\d+)%/.exec(text);
      const note = text.split(/(?<=%)\.\s+|(?<=frame)\.\s+/).slice(1).join(" ").replace(/\s*Dropped:.*$/, "").trim();
      return {
        faceId: id,
        sightline: /(clear|partial|blocked) (?:sightline|read)/i.exec(text)?.[1]?.toLowerCase() ?? "clear",
        clutter: /(low|medium|high) clutter/i.exec(text)?.[1]?.toLowerCase() ?? "low",
        share: share ? Number(share[1]) / 100 : null,
        note: note || text,
        dropped: /dropped/i.test(text),
        model: s.model,
        ms: s.ms,
        costUsd: s.costUsd,
      };
    })
    .sort((a, b) => Number(b.dropped) - Number(a.dropped));
}

export interface RunSummary {
  steps: number;
  costUsd: number;
  seconds: number | null;
  models: { role: string; model: string; calls: number; costUsd: number }[];
  review: string | null;
  guard: string | null;
}

export function runSummary(run: RunData["run"]): RunSummary {
  const byModel = new Map<string, { role: string; model: string; calls: number; costUsd: number }>();
  for (const s of run.steps) {
    if (!s.model) continue;
    const m = byModel.get(s.model) ?? { role: s.role, model: s.model, calls: 0, costUsd: 0 };
    m.calls += 1;
    m.costUsd += s.costUsd ?? 0;
    byModel.set(s.model, m);
  }
  const ms = run.endedAt ? Date.parse(run.endedAt) - Date.parse(run.startedAt) : null;
  return {
    steps: run.steps.length,
    costUsd: run.costUsd,
    seconds: ms !== null && ms > 0 ? Math.round(ms / 100) / 10 : null,
    models: [...byModel.values()].sort((a, b) => b.calls - a.calls),
    review: run.steps.find((s) => s.role === "ultra")?.summary ?? null,
    guard: [...run.steps].reverse().find((s) => s.role === "live-guard")?.summary ?? null,
  };
}

export interface SignOff {
  lines: number;
  nemoPassed: number;
  livePassed: number;
  status: string;
  jobId: string | null;
}

export function signOff(d: PlanData): SignOff {
  const all = d.plan.picks.flatMap((p) => p.copy);
  return {
    lines: all.length,
    nemoPassed: all.filter((c) => c.nemo?.status === "pass").length,
    livePassed: all.filter((c) => c.guard.status !== "blocked").length,
    status: d.plan.status,
    jobId: d.plan.nemoJobId,
  };
}

/** Project heat cells and picked faces onto a w x h box (equirectangular is fine at city scale). Cell affinity is
 *  rescaled to 0..1 over the plan's own cells (t), so the hottest block is always the deepest red. */
export function project(d: PlanData, w: number, h: number, pad = 0.06) {
  const cells = d.plan.heat;
  if (cells.length === 0) return { cells: [], picks: [] };
  const lats = cells.map((c) => c.lat);
  const lngs = cells.map((c) => c.lng);
  const affs = cells.map((c) => c.affinity);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const [minA, maxA] = [Math.min(...affs), Math.max(...affs)];
  const px = w * pad;
  const py = h * pad;
  const sx = (lng: number) => px + ((lng - minLng) / (maxLng - minLng || 1)) * (w - 2 * px);
  const sy = (lat: number) => h - py - ((lat - minLat) / (maxLat - minLat || 1)) * (h - 2 * py);
  const faces = new Map(d.faces.map((f) => [f.id, f]));
  return {
    cells: cells.map((c) => ({ x: sx(c.lng), y: sy(c.lat), t: maxA > minA ? (c.affinity - minA) / (maxA - minA) : 1, id: c.geohash })),
    picks: d.plan.picks
      .map((p) => ({ p, f: faces.get(p.faceId) }))
      .filter((x) => x.f && x.f.lat >= minLat && x.f.lat <= maxLat && x.f.lng >= minLng && x.f.lng <= maxLng)
      .map(({ p, f }) => ({ id: p.faceId, rank: p.rank, x: sx(f!.lng), y: sy(f!.lat) })),
  };
}
