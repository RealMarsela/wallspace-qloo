import type { CSSProperties } from "react";

/** Crosswalk junction drawn in a StreetCanvas where two streets cross: a square block with zebra stripes.
 *  angle 0 = stripes run vertically (crossing a horizontal street). */
export function CrosswalkSvg({ x, y, size = 44, angle = 0, fill = "#22211d", stripe = "#fbfaf7", delay = 0 }: { x: number; y: number; size?: number; angle?: number; fill?: string; stripe?: string; delay?: number }) {
  const n = 5;
  const sw = size / (n * 2 + 1);
  return (
    <g aria-hidden transform={`rotate(${angle} ${x} ${y})`}>
      <g className="ws-pop" style={{ "--delay": `${delay}ms`, transformOrigin: `${x}px ${y}px`, transformBox: "view-box" } as CSSProperties}>
        <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx={5} fill={fill} />
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={x - size / 2 + sw * (1 + i * 2)} y={y - size / 2 + sw} width={sw} height={size - sw * 2} rx={1} fill={stripe} />
        ))}
      </g>
    </g>
  );
}

/** Standalone crosswalk block for HTML layout (section dividers, empty states, the sign-in visual). */
export function CrosswalkBlock({ size = 40, tone = "night", className = "" }: { size?: number; tone?: "night" | "paper" | "signal"; className?: string }) {
  const f = tone === "night" ? "#22211d" : tone === "signal" ? "var(--signal)" : "#fbfaf7";
  const s = tone === "paper" ? "#22211d" : tone === "signal" ? "#22211d" : "#fbfaf7";
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 44 44" className={className}>
      <rect width="44" height="44" rx="6" fill={f} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={4 + i * 8} y="4" width="4" height="36" rx="1" fill={s} />
      ))}
    </svg>
  );
}
