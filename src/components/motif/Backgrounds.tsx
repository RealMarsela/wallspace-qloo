import type { CSSProperties, ReactNode } from "react";

/** Dot grid for night bands. Put it absolutely behind content; fades toward the centre so headings stay clean. */
export function DotGrid({ className = "", gap = 18, color = "rgb(255 255 255 / 0.1)", fade = true }: { className?: string; gap?: number; color?: string; fade?: boolean }) {
  return (
    <div
      aria-hidden
      className={`ws-dots pointer-events-none absolute inset-0 ${className}`}
      style={
        {
          "--dot": color,
          "--dot-gap": `${gap}px`,
          maskImage: fade ? "radial-gradient(ellipse 60% 70% at 50% 45%, transparent 30%, #000 80%)" : undefined,
          WebkitMaskImage: fade ? "radial-gradient(ellipse 60% 70% at 50% 45%, transparent 30%, #000 80%)" : undefined,
        } as CSSProperties
      }
    />
  );
}

/** Paper section with faint vertical pinstripes in the gutters left and right of the 1192px column (desktop only). */
export function PinstripeSection({ children, className = "", id, labelledBy, testId }: { children: ReactNode; className?: string; id?: string; labelledBy?: string; testId?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} data-testid={testId} className={`relative ${className}`}>
      <PinstripeGutter />
      <div className="relative">{children}</div>
    </section>
  );
}

export function PinstripeGutter() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <div className="ws-pinstripe absolute inset-y-0 left-0 w-[max(0px,calc((100%-var(--content))/2-24px))] opacity-70 [mask-image:linear-gradient(90deg,#000,transparent)]" />
      <div className="ws-pinstripe absolute inset-y-0 right-0 w-[max(0px,calc((100%-var(--content))/2-24px))] opacity-70 [mask-image:linear-gradient(270deg,#000,transparent)]" />
    </div>
  );
}
