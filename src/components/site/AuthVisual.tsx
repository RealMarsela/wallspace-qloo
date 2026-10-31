"use client";
import { useEffect, useState } from "react";
import { BillboardStopSvg } from "@/components/motif/BillboardStop";
import { CrosswalkSvg } from "@/components/motif/Crosswalk";
import { DotGrid } from "@/components/motif/Backgrounds";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { useSample } from "@/components/landing/data";
import { pickRows } from "@/components/landing/derive";
import { proofPicks } from "@/components/landing/ProofCards";

const NIGHT = "#22211d";

/** Visual half of /signin: a street grid with crosswalk junctions and billboard stops carrying the sample plan's face IDs,
 *  and a caption cycling through the lines the sample plan runs on them. Decorative except for the caption. */
export function AuthVisual() {
  const s = useSample();
  const rows = s.plan.status === "ready" ? pickRows(s.plan.data) : [];
  const lines = proofPicks(rows);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lines.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 4200);
    return () => clearInterval(t);
  }, [lines.length]);
  const ids = rows.slice(0, 4).map((r) => r.faceId);
  const cur = lines[i % Math.max(1, lines.length)];
  return (
    <div className="relative h-full overflow-hidden rounded-xl bg-night text-on-night">
      <DotGrid fade={false} color="rgb(255 255 255 / 0.06)" />
      <StreetCanvas viewBox="0 0 800 1000" fit="slice" className="absolute inset-0">
        <Street points={[[-20, 250], [820, 250]]} lanes={[{ ink: "lilac" }, { ink: "signal", line: "dot", lineInk: "night" }]} edge={NIGHT} />
        <Street points={[[300, -20], [300, 1020]]} lanes={[{ ink: "poster", line: "dash" }]} edge={NIGHT} delay={200} />
        <Street points={[[-20, 640], [380, 640], [480, 540], [820, 540]]} lanes={[{ ink: "park" }, { ink: "cobalt", line: "dash" }]} edge={NIGHT} radius={90} delay={350} />
        <Street points={[[620, -20], [620, 1020]]} lanes={[{ ink: "signal", line: "double", lineInk: "night" }, { ink: "lilac", line: "dot" }]} edge={NIGHT} delay={500} />
        <CrosswalkSvg x={300} y={250} size={58} delay={900} />
        <CrosswalkSvg x={620} y={250} size={58} delay={950} />
        <CrosswalkSvg x={620} y={540} size={58} delay={1000} />
        <CrosswalkSvg x={300} y={640} size={58} delay={1050} />
        {ids.length ? (
          <>
            <BillboardStopSvg x={460} y={250} w={120} h={46} ink="park" text={ids[0]} label={`Face ${ids[0]}`} delay={1200} />
            <BillboardStopSvg x={620} y={400} w={120} h={46} ink="signal" text={ids[1]} label={`Face ${ids[1]}`} delay={1300} />
            <BillboardStopSvg x={150} y={640} w={120} h={46} ink="lilac" text={ids[2]} label={`Face ${ids[2]}`} delay={1400} />
            <BillboardStopSvg x={300} y={830} w={120} h={46} ink="poster" text={ids[3]} label={`Face ${ids[3]}`} delay={1500} />
          </>
        ) : null}
      </StreetCanvas>
      <div className="absolute inset-x-6 bottom-6 rounded-lg border border-night-line bg-night/90 p-6 backdrop-blur-sm sm:inset-x-10 sm:bottom-10">
        <p className="eyebrow !text-on-night-muted">From the sample plan</p>
        <div aria-live="polite" className="mt-3 min-h-[4.5rem]">
          {cur ? (
            <div key={cur.faceId} className="ws-rise [--delay:0ms]">
              <p className="text-h3">&ldquo;{cur.line}&rdquo;</p>
              <p className="mt-2 font-mono text-micro text-on-night-muted">
                {cur.faceId} · {cur.neighbourhood} · written for a block that over-indexes on {cur.lifts[0]?.tag ?? "its tastes"}
              </p>
            </div>
          ) : (
            <p className="text-h3 text-on-night-muted">Taste by place. Never by identity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
