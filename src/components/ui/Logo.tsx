/** The Wallspace mark (billboard on a post, green face with crosswalk stripes) drawn inline so it follows the theme.
 *  Geometry matches scripts/brand-svg.mjs. tone "auto" uses ink/paper tokens; "night" forces the light-on-dark version. */
const BARS = Array.from({ length: 8 }, (_, i) => -1.9 + i * 14.2);

export function LogoMark({ size = 28, tone = "auto", className = "" }: { size?: number; tone?: "auto" | "night" | "paper"; className?: string }) {
  const frame = tone === "night" ? "#fbfaf7" : tone === "paper" ? "#22211d" : "var(--ink)";
  const band = tone === "night" ? "#22211d" : tone === "paper" ? "#fbfaf7" : "var(--paper)";
  const id = `wsm-${tone}`;
  return (
    <svg width={(size * 96) / 72} height={size} viewBox="0 0 96 72" aria-hidden className={className}>
      <defs>
        <clipPath id={id}>
          <rect x="5.5" y="5.5" width="85" height="44" rx="2.9" />
        </clipPath>
      </defs>
      <rect x="42.5" y="54" width="11" height="18" fill={frame} />
      <rect x="2.75" y="2.75" width="90.5" height="49.5" rx="5.65" fill="#3FD6A0" stroke={frame} strokeWidth="5.5" />
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="15.6" width="96" height="24.2" fill={band} />
        <g fill="#3FD6A0">
          {BARS.map((x) => (
            <path key={x} d={`M${(x + 7.4).toFixed(2)} 15.2H${(x + 13.1).toFixed(2)}L${(x + 5.7).toFixed(2)} 40.2H${x.toFixed(2)}Z`} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** Mark + wordmark in Host Grotesk. Use in nav, footer, sign-in. */
export function Logo({ size = 26, tone = "auto", className = "" }: { size?: number; tone?: "auto" | "night" | "paper"; className?: string }) {
  const color = tone === "night" ? "text-on-night" : tone === "paper" ? "text-[#22211d]" : "text-ink";
  return (
    <span className={`inline-flex items-center gap-2.5 ${color} ${className}`}>
      <LogoMark size={size} tone={tone} />
      <span className="font-display tracking-[-0.02em]" style={{ fontSize: size * 0.95, lineHeight: 1 }}>
        Wallspace
      </span>
    </span>
  );
}
