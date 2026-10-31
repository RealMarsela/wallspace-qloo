import type { ReactNode } from "react";

/** CSS-only tooltip on hover and keyboard focus. The trigger must be focusable (a button or link) or pass focusable. */
export function Tooltip({ tip, children, side = "top", focusable = false, className = "" }: { tip: ReactNode; children: ReactNode; side?: "top" | "bottom"; focusable?: boolean; className?: string }) {
  const pos = side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]";
  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {focusable ? (
        <span tabIndex={0} className="inline-flex rounded-xs">
          {children}
        </span>
      ) : (
        children
      )}
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute left-1/2 z-50 w-max max-w-[min(260px,80vw)] -translate-x-1/2 translate-y-1 rounded-md bg-night px-2.5 py-1.5 text-micro text-on-night opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100 ${pos}`}
      >
        {tip}
      </span>
    </span>
  );
}
