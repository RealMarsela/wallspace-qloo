"use client";
import { useMemo, type CSSProperties } from "react";
import { useSample } from "../data";
import { project } from "../derive";
import { MediaFrame, MediaLoading } from "./MediaFrame";

const W = 560;
const H = 360;
const RAMP = ["var(--h1)", "var(--h2)", "var(--h3)", "var(--h4)"];

/** The sample plan's real Qloo heat cells over Atlanta, hottest last, with the picked faces as numbered billboard pins. */
export function HeatMedia() {
  const s = useSample();
  const data = s.plan.status === "ready" ? s.plan.data : null;
  const geo = useMemo(() => (data ? project(data, W, H) : null), [data]);
  return (
    <MediaFrame title="Audience heat · Atlanta" meta={geo ? `${geo.cells.length} cells · Qloo` : "Qloo"}>
      {!geo ? (
        <MediaLoading failed={s.plan.status === "error"} />
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" role="img" aria-label={`Heat map of ${geo.cells.length} Qloo cells with ${geo.picks.length} picked faces`}>
          <defs>
            <filter id="heat-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <g stroke="var(--line)" strokeWidth="1">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={`v${i}`} x1={i * 50 + 10} y1="0" x2={i * 50 + 10} y2={H} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 50 + 5} x2={W} y2={i * 50 + 5} />
            ))}
            <path d={`M0 ${H * 0.78} L${W * 0.45} ${H * 0.36} L${W} ${H * 0.3}`} strokeWidth="5" stroke="var(--panel-2)" fill="none" />
          </g>
          <g filter="url(#heat-blur)">
            {[...geo.cells]
              .sort((a, b) => a.t - b.t)
              .map((c, i) => (
                <circle
                  key={c.id + i}
                  className="ws-pop"
                  cx={c.x}
                  cy={c.y}
                  r={8 + c.t * 6}
                  fill={RAMP[Math.min(3, Math.floor(c.t * 4))]}
                  opacity={0.35 + c.t * 0.6}
                  style={{ "--delay": `${Math.round(c.t * 900)}ms`, transformOrigin: `${c.x}px ${c.y}px`, transformBox: "view-box" } as CSSProperties}
                />
              ))}
          </g>
          {geo.picks.map((p) => (
            <g key={p.id} className="ws-pop" style={{ "--delay": `${1100 + p.rank * 70}ms`, transformOrigin: `${p.x}px ${p.y}px`, transformBox: "view-box" } as CSSProperties}>
              <rect x={p.x - 2} y={p.y} width="4" height="9" fill="#22211d" />
              <rect x={p.x - 13} y={p.y - 14} width="26" height="16" rx="4" fill="var(--park)" stroke="#22211d" strokeWidth="2" />
              <text x={p.x} y={p.y - 2.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500" fill="#22211d">
                {p.rank}
              </text>
              <title>{`Pick ${p.rank}: ${p.id}`}</title>
            </g>
          ))}
          <g transform={`translate(16 ${H - 30})`} fontFamily="var(--font-mono)" fontSize="10" fill="var(--muted)">
            <rect width="168" height="20" rx="4" fill="var(--surface)" stroke="var(--line)" />
            {RAMP.map((c, i) => (
              <rect key={c} x={8 + i * 14} y="6" width="12" height="8" rx="2" fill={c} />
            ))}
            <text x="70" y="13.5">taste match, low to high</text>
          </g>
        </svg>
      )}
    </MediaFrame>
  );
}
