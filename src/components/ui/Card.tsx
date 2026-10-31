import type { ElementType, ReactNode } from "react";

export type Surface = "panel" | "surface" | "paper" | "night" | "night-2";

const surfaces: Record<Surface, string> = {
  panel: "bg-panel text-ink",
  surface: "bg-surface text-ink border border-line",
  paper: "bg-paper text-ink border border-line",
  night: "bg-night text-on-night",
  "night-2": "bg-night-2 text-on-night",
};

/** The one card. radius "md" (8) for cards and rows, "lg" (14) for feature panels, "xl" (20) for bands. */
export function Card({
  as: Tag = "div",
  surface = "panel",
  radius = "md",
  pad = "md",
  className = "",
  children,
  testId,
}: {
  as?: ElementType;
  surface?: Surface;
  radius?: "md" | "lg" | "xl";
  pad?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
  testId?: string;
}) {
  const r = radius === "xl" ? "rounded-xl" : radius === "lg" ? "rounded-lg" : "rounded-md";
  const p = { none: "", sm: "p-3", md: "p-5", lg: "p-6 sm:p-8" }[pad];
  return (
    <Tag data-testid={testId} className={`${surfaces[surface]} ${r} ${p} ${className}`}>
      {children}
    </Tag>
  );
}

/** Panel = Card on the panel surface; kept as its own name because product pages read better with it. */
export function Panel(props: Omit<Parameters<typeof Card>[0], "surface">) {
  return <Card {...props} surface="panel" />;
}
