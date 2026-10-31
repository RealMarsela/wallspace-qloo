import type { ElementType, ReactNode } from "react";

/** Weight-600 emphasis on a single word inside a 400-weight heading ("built for <Em>buyers</Em>"). */
export function Em({ children }: { children: ReactNode }) {
  return <em className="em">{children}</em>;
}

/** Section heading: optional eyebrow, H2 (or given level), optional lede. align "center" for overview bands. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  as: H = "h2",
  align = "left",
  size = "h2",
  tone = "paper",
  id,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  as?: ElementType;
  align?: "left" | "center";
  size?: "display" | "h2" | "h3";
  tone?: "paper" | "night";
  id?: string;
  className?: string;
}) {
  const center = align === "center" ? "mx-auto text-center items-center" : "items-start";
  const fs = { display: "text-display", h2: "text-h2", h3: "text-h3" }[size];
  const muted = tone === "night" ? "text-on-night-muted" : "text-muted";
  return (
    <div className={`flex max-w-[44rem] flex-col gap-4 ${center} ${className}`}>
      {eyebrow ? <p className={`eyebrow ${tone === "night" ? "!text-on-night-muted" : ""}`}>{eyebrow}</p> : null}
      <H id={id} className={fs}>
        {title}
      </H>
      {lede ? <p className={`max-w-[34rem] text-body ${muted}`}>{lede}</p> : null}
    </div>
  );
}
