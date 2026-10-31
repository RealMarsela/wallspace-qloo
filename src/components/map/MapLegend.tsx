/** Map key on a surface chip: the heat ramp from signal yellow to poster red, picked faces as numbered billboards, other faces as dots. */
export function MapLegend() {
  return (
    <div data-testid="map-legend" className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 flex max-w-[calc(100%-20px)] flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-md border border-line bg-surface/95 px-2.5 py-1.5 text-micro text-ink-2 shadow-sm backdrop-blur-sm">
      <span className="flex items-center gap-1.5">
        Fans per block
        <i aria-hidden className="block h-2 w-14 rounded-full" style={{ background: "linear-gradient(90deg, rgba(255,209,46,0.35), var(--signal), #ff8a3d, var(--poster))" }} />
      </span>
      <span className="flex items-center gap-1.5">
        <i aria-hidden className="grid h-3.5 w-5 place-items-center rounded-[3px] border-[1.5px] border-[#22211d] bg-park font-mono text-[8px] leading-none text-[#22211d]">1</i> picked
      </span>
      <span className="flex items-center gap-1.5">
        <i aria-hidden className="block size-1.5 rounded-full bg-ink" /> other faces
      </span>
    </div>
  );
}
