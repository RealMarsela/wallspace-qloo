"use client";
import "./learn.css";
import type { CSSProperties } from "react";
import type { RunStep } from "@/contract";
import { StopCard } from "./StopCard";
import { measure, stops, type Variant } from "./steps";

const LANES: { lane: string; mark: string }[] = [
  { lane: "var(--signal)", mark: "#22211d" },
  { lane: "var(--poster)", mark: "#22211d" },
  { lane: "var(--cobalt)", mark: "#fbfaf7" },
];

/** The pipeline as a street: three lanes run down the page (left edge on phones, centre on desktop) and every step is a
 *  billboard stop on a post beside it, alternating sides on desktop. Phase changes sit on crosswalks. */
export function RouteMap({ variant, steps }: { variant: Variant; steps: RunStep[] | null | "loading" }) {
  return (
    <section aria-labelledby="route-title" data-testid="how-route" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="route-title" className="text-h4">
          The route a brief takes
        </h2>
        <p className="text-small text-muted">Fourteen stops, in order. Each one links to where you can watch it work in the sample plan.</p>
      </div>
      <div className="relative">
        <div aria-hidden className="absolute bottom-0 left-3 top-0 flex gap-[5px] md:left-1/2 md:-translate-x-1/2">
          {LANES.map((l) => (
            <i key={l.lane} className="ws-route-lane block h-full" style={{ "--lane": l.lane, "--mark": l.mark } as CSSProperties} />
          ))}
        </div>
        <ol className="grid grid-cols-1 gap-y-7 pl-16 md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] md:gap-y-5 md:pl-0">
          {stops.map((s, i) => {
            const side = i % 2 === 0 ? "left" : "right";
            const m = steps === "loading" ? "loading" : steps ? measure(s, steps) : null;
            return (
              <li
                key={s.n}
                className={`${side === "left" ? "md:col-start-1" : "md:col-start-3"} md:[grid-row:var(--r)/span_2]`}
                style={{ "--r": i + 1 } as CSSProperties}
              >
                <StopCard stop={s} variant={variant} measured={m} side={side} phaseStart={i === 0 || stops[i - 1].phase !== s.phase} />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
