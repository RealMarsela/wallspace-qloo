import type { ReactNode } from "react";
import { inkFill, type Ink } from "./Pill";

/** Accent tile holding an ink glyph (feature cards, bento, settings rows). Optional label sits to the right. */
export function IconChip({ ink = "signal", children, label, size = "md", className = "" }: { ink?: Ink; children: ReactNode; label?: ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "size-6 rounded-xs [&_svg]:size-3.5", md: "size-8 rounded-md [&_svg]:size-[18px]", lg: "size-11 rounded-md [&_svg]:size-6" }[size];
  const tile = (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center border border-[#22211d]/15 ${inkFill[ink]} ${box}`}>
      {children}
    </span>
  );
  if (!label) return <span className={className}>{tile}</span>;
  return (
    <span className={`inline-flex items-center gap-2.5 text-small text-ink ${className}`}>
      {tile}
      {label}
    </span>
  );
}
