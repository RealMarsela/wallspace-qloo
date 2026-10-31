/** Affinity / score bar. Sodium by default (audience heat); green when the face is picked. */
export function ScoreBar({ value, tone = "heat", label, className = "" }: { value: number; tone?: "heat" | "picked" | "ink"; label?: string; className?: string }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  const fill = tone === "picked" ? "bg-picked" : tone === "ink" ? "bg-ink" : "bg-heat";
  return (
    <span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(value.toFixed(2))}
      aria-label={label ?? "affinity"}
      className={`relative block h-[5px] overflow-hidden rounded-[1px] bg-rule-2 ${className}`}
    >
      <i className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${w}%` }} />
    </span>
  );
}
