import type { CSSProperties, ReactNode } from "react";
import { offsetPolyline, roundedPath, type Pt } from "./geometry";
import { InView } from "./InView";

export type StreetInk = "signal" | "poster" | "cobalt" | "park" | "lilac" | "paper" | "night";
export type LaneLine = "dash" | "dot" | "double" | "none";

export interface Lane {
  ink: StreetInk;
  /** Centre marking. dash = lane dashes, dot = round studs, double = a two-way centre line. */
  line?: LaneLine;
  /** Marking colour; defaults to night on light inks and paper on cobalt/night. */
  lineInk?: StreetInk;
}

const fill: Record<StreetInk, string> = {
  signal: "var(--signal)",
  poster: "var(--poster)",
  cobalt: "var(--cobalt)",
  park: "var(--park)",
  lilac: "var(--lilac)",
  paper: "#fbfaf7",
  night: "#22211d",
};

const defaultLine = (ink: StreetInk): StreetInk => (ink === "cobalt" || ink === "night" ? "paper" : "night");

/** One street: parallel lanes along a 90/45-degree polyline with big-radius bends. Lanes draw in (900 ms) when the
 *  surrounding StreetCanvas/InView enters view, markings fade in after and then crawl slowly like traffic.
 *  `edge` draws a kerb in the background colour under each lane so crossing streets read as layered. */
export function Street({
  points,
  lanes,
  width = 18,
  gap = 5,
  radius = 72,
  delay = 0,
  edge,
  crawl = true,
}: {
  points: readonly Pt[];
  lanes: Lane[];
  width?: number;
  gap?: number;
  radius?: number;
  delay?: number;
  edge?: string;
  crawl?: boolean;
}) {
  const pitch = width + gap;
  const mid = (lanes.length - 1) / 2;
  return (
    <g aria-hidden>
      {lanes.map((lane, i) => {
        const off = (i - mid) * pitch;
        const d = roundedPath(offsetPolyline(points, off), radius, off);
        const lineInk = fill[lane.lineInk ?? defaultLine(lane.ink)];
        const line = lane.line ?? "dash";
        const style = { "--delay": `${delay + i * 90}ms` } as CSSProperties;
        const laneStyle = { "--delay": `${delay + i * 90 + 650}ms` } as CSSProperties;
        const period = line === "dot" ? 14 : 22;
        const crawlStyle = { "--crawl-to": `-${period * 4}px` } as CSSProperties;
        return (
          <g key={i}>
            {edge ? <path d={d} pathLength={1} className="ws-draw" style={style} fill="none" stroke={edge} strokeWidth={width + 6} /> : null}
            <path d={d} pathLength={1} className="ws-draw" style={style} fill="none" stroke={fill[lane.ink]} strokeWidth={width} />
            {line === "none" ? null : (
              <g className="ws-lane" style={laneStyle}>
                {line === "double" ? (
                  <>
                    <path d={roundedPath(offsetPolyline(points, off - 2.5), radius, off - 2.5)} fill="none" stroke={lineInk} strokeWidth={1.6} />
                    <path d={roundedPath(offsetPolyline(points, off + 2.5), radius, off + 2.5)} fill="none" stroke={lineInk} strokeWidth={1.6} />
                  </>
                ) : (
                  <path
                    d={d}
                    fill="none"
                    stroke={lineInk}
                    strokeWidth={line === "dot" ? 4.5 : 2.2}
                    strokeLinecap="round"
                    strokeDasharray={line === "dot" ? "0.1 14" : "11 11"}
                    className={crawl ? "ws-crawl" : undefined}
                    style={crawlStyle}
                  />
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** SVG canvas for streets, crosswalks and SVG billboard stops. Starts its draw-in when it enters view.
 *  fit "slice" covers the box (decorative bands); "meet" keeps the whole drawing (connector maps). */
export function StreetCanvas({
  viewBox,
  children,
  className = "",
  fit = "slice",
  align = "xMidYMid",
  style,
  label,
}: {
  viewBox: string;
  children: ReactNode;
  className?: string;
  fit?: "slice" | "meet";
  align?: string;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <InView className={`pointer-events-none ${className}`} style={style} aria-hidden={label ? undefined : true}>
      <svg viewBox={viewBox} preserveAspectRatio={`${align} ${fit}`} className="block size-full overflow-hidden" role={label ? "img" : undefined} aria-label={label}>
        {children}
      </svg>
    </InView>
  );
}
