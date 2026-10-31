/** "01 02 03" step marker: Geist Mono 500 in a 40px circle. tone "night" on dark bands, "paper" on panels. */
export function StepNumber({ n, tone = "night", size = 40, className = "" }: { n: number; tone?: "night" | "paper"; size?: number; className?: string }) {
  const t = tone === "night" ? "bg-[#3a3833] text-on-night" : "bg-surface text-ink border border-line";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-grid shrink-0 place-items-center rounded-full font-mono text-[0.8rem] font-medium tabular-nums ${t} ${className}`}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}
