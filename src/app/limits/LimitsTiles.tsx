import type { CSSProperties, ReactNode } from "react";

/** One measured number: label, big mono value, a plain line saying what it is, and where it comes from. */
export function Tile({ label, value, id, note, source, children, className = "" }: { label: string; value: ReactNode; id: string; note?: ReactNode; source: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`ws-fade-up flex flex-col rounded-lg bg-panel p-5 sm:p-6 ${className}`}>
      <p className="eyebrow">{label}</p>
      <p data-testid={id} className="mt-3 font-mono text-h3 tabular-nums text-ink">
        {value}
      </p>
      {note ? <p className="mt-2 text-small text-muted">{note}</p> : null}
      {children}
      <p className="mt-auto pt-5 font-mono text-[0.66rem] uppercase tracking-wider text-muted">Source: {source}</p>
    </div>
  );
}

/** Half-ring gauge for a 0..1 rate; null renders an empty dashed ring labelled "not measured yet". */
export function Gauge({ value, label, ink, testId }: { value: number | null; label: string; ink: string; testId: string }) {
  const r = 46;
  const len = Math.PI * r;
  const v = value ?? 0;
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-full max-w-[160px]" role="img" aria-label={`${label}: ${value === null ? "not measured yet" : `${Math.round(v * 100)}%`}`}>
        <path d="M14 62a46 46 0 0 1 92 0" fill="none" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" strokeDasharray={value === null ? "4 6" : undefined} />
        {value !== null ? (
          <path
            className="ws-gauge"
            d="M14 62a46 46 0 0 1 92 0"
            fill="none"
            stroke={ink}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${len} ${len}`}
            style={{ "--gauge-from": `${len}`, strokeDashoffset: len * (1 - v) } as CSSProperties}
          />
        ) : null}
      </svg>
      <figcaption className="-mt-6 text-center">
        <span data-testid={testId} className="block font-mono text-h4 tabular-nums">
          {value === null ? "not measured yet" : `${Math.round(v * 100)}%`}
        </span>
        <span className="text-micro text-muted">{label}</span>
      </figcaption>
    </figure>
  );
}

/** Two numbers compared on one scale (cost per plan vs the sample plan's own run). */
export function CompareBars({ rows }: { rows: { label: string; value: number; text: string; ink: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1e-9);
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-micro">
          <span className="text-ink-2">{r.label}</span>
          <span className="font-mono tabular-nums">{r.text}</span>
          <span className="col-span-2 h-2.5 rounded-full bg-surface">
            <i className="ws-bar block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.ink, "--delay": `${200 + i * 150}ms` } as CSSProperties} />
          </span>
        </li>
      ))}
    </ul>
  );
}
