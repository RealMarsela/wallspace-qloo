import type { ReactNode } from "react";

/** Framed product window: night title bar (breadcrumb tabs on the left, actions on the right) over a surface body.
 *  Wraps real Wallspace UI built in HTML (hero picks table, feature media, map frames). */
export function ProductWindow({
  crumbs,
  actions,
  toolbar,
  children,
  className = "",
  bodyClassName = "",
  testId,
  label,
}: {
  crumbs: ReactNode[];
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  testId?: string;
  label?: string;
}) {
  return (
    <figure data-testid={testId} aria-label={label} className={`overflow-hidden rounded-lg border border-night-line bg-night p-1.5 shadow-lg ${className}`}>
      <div className="flex items-center gap-1.5 pb-1.5">
        <div className="flex min-w-0 items-center gap-1 rounded-md bg-night-2 p-1 text-micro text-on-night">
          {crumbs.map((c, i) => (
            <span key={i} className={`truncate rounded-[5px] px-2 py-1 ${i === crumbs.length - 1 ? "bg-[#3a3833]" : "text-on-night-muted"}`}>
              {c}
            </span>
          ))}
        </div>
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 rounded-md bg-night-2 p-1">{actions}</div>
      </div>
      <div className={`overflow-hidden rounded-md bg-surface text-ink ${bodyClassName}`}>
        {toolbar ? <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">{toolbar}</div> : null}
        {children}
      </div>
    </figure>
  );
}

/** Small white action chip for a window title bar ("Send", "Export"). Visual only. */
export function WindowChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-[5px] bg-white px-2 py-1 text-micro text-[#22211d]">{children}</span>;
}
