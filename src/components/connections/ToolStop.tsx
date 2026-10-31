import type { StopInk } from "./connections-api";

const ring: Record<StopInk, string> = { signal: "var(--signal)", poster: "var(--poster)", cobalt: "var(--cobalt)", park: "var(--park)", lilac: "var(--lilac)" };

/** The tile's street band: a road with a dashed lane, a crosswalk, and the tool's logo on a billboard-face stop.
 *  Lit (connected or built in) = the stop takes the tool's ink and the logo shows in colour; otherwise grey. */
export function ToolStop({ logo, ink, lit, error, name }: { logo: string | null; ink: StopInk; lit: boolean; error: boolean; name: string }) {
  const color = error ? "var(--poster)" : lit ? ring[ink] : "var(--line-2)";
  return (
    <div aria-hidden className="relative h-[86px] shrink-0">
      <div className="absolute inset-x-0 top-[34px] h-[18px] bg-panel-2">
        <i className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,var(--surface)_0_10px,transparent_10px_20px)] opacity-90" />
      </div>
      <svg width="30" height="26" viewBox="0 0 30 26" className="absolute right-6 top-[30px]">
        <rect width="30" height="26" rx="4" fill="var(--panel-2)" />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={3 + i * 5.4} y="3" width="2.6" height="20" rx="1" fill="var(--surface)" />)}
      </svg>
      <div className="absolute left-5 top-[14px] flex flex-col items-center">
        <span className="grid h-[48px] w-[88px] place-items-center rounded-md border-[3px] bg-surface shadow-sm transition-colors duration-200" style={{ borderColor: color }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className={`h-6 w-auto max-w-[56px] object-contain transition-[filter,opacity] duration-200 ${lit ? "" : "opacity-70 grayscale"}`} />
          ) : (
            <span className={`font-mono text-[0.68rem] tracking-wide ${lit ? "text-ink" : "text-muted"}`} title={name}>OpenOOH</span>
          )}
        </span>
        <i className="block h-2.5 w-2 rounded-b-[2px] transition-colors duration-200" style={{ background: color }} />
      </div>
    </div>
  );
}
