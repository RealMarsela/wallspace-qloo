import type { CSSProperties, ReactNode } from "react";
import type { StreetInk } from "./StreetRibbon";

const ring: Record<StreetInk, string> = {
  signal: "var(--signal)",
  poster: "var(--poster)",
  cobalt: "var(--cobalt)",
  park: "var(--park)",
  lilac: "var(--lilac)",
  paper: "#fbfaf7",
  night: "#22211d",
};

/** A billboard face as a "stop" in normal layout: rounded frame (3:1 or 2:1) ringed in a street ink, on a short post.
 *  Holds a copy line, a face ID or a logo. Pops in when an InView ancestor enters view (pass delay to stagger). */
export function BillboardStop({
  ink = "park",
  ratio = "3:1",
  tone = "surface",
  post = true,
  delay = 0,
  className = "",
  children,
  testId,
}: {
  ink?: StreetInk;
  ratio?: "3:1" | "2:1" | "auto";
  tone?: "surface" | "night";
  post?: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
  testId?: string;
}) {
  const aspect = ratio === "3:1" ? "aspect-[3/1]" : ratio === "2:1" ? "aspect-[2/1]" : "";
  const face = tone === "night" ? "bg-night text-on-night" : "bg-surface text-ink";
  return (
    <span data-testid={testId} className={`ws-pop inline-flex flex-col items-center ${className}`} style={{ "--delay": `${delay}ms` } as CSSProperties}>
      <span className={`grid w-full place-items-center rounded-md border-[3px] px-3 py-2 ${aspect} ${face}`} style={{ borderColor: ring[ink] }}>
        {children}
      </span>
      {post ? <i aria-hidden className="block h-3 w-2 rounded-b-[2px]" style={{ background: ring[ink] }} /> : null}
    </span>
  );
}

/** The same stop drawn inside a StreetCanvas (SVG), centred on (x, y). A logo goes in `href`; it shows greyscale at rest
 *  and in colour on hover/focus. With `link` the stop is a real link with an accessible name. */
export function BillboardStopSvg({
  x,
  y,
  w = 96,
  h = 48,
  ink = "park",
  logo,
  label,
  link,
  text,
  delay = 0,
  face = "#fbfaf7",
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  ink?: StreetInk;
  logo?: string;
  label: string;
  link?: string;
  text?: string;
  delay?: number;
  face?: string;
}) {
  const pad = Math.round(h * 0.2);
  const body = (
    <g className="ws-stop ws-pop" style={{ "--delay": `${delay}ms`, transformOrigin: `${x}px ${y}px`, transformBox: "view-box" } as CSSProperties}>
      <rect x={x - 5} y={y + h / 2 - 1} width={10} height={12} rx={2} fill={ring[ink]} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={9} fill={face} stroke={ring[ink]} strokeWidth={5} />
      {logo ? (
        <image className="ws-stop-logo" href={logo} x={x - w / 2 + pad} y={y - h / 2 + pad} width={w - pad * 2} height={h - pad * 2} preserveAspectRatio="xMidYMid meet" />
      ) : null}
      {text ? (
        <text x={x} y={y + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={14} fill="#22211d">
          {text}
        </text>
      ) : null}
      <title>{label}</title>
    </g>
  );
  if (!link) return body;
  return (
    <a href={link} aria-label={label} className="ws-stop-link">
      {body}
    </a>
  );
}
