"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { InView } from "@/components/motif/InView";
import { PinstripeSection } from "@/components/motif/Backgrounds";
import { Street, StreetCanvas, type StreetInk } from "@/components/motif/StreetRibbon";
import { Em, SectionHeading } from "@/components/ui/SectionHeading";
import { Skeleton } from "@/components/ui/States";
import { Shield } from "@/components/ui/icons";
import { kindName } from "@/components/ui/format";
import { faceHref, SAMPLE_PLAN_ID } from "@/lib/routes";
import { useSample } from "./data";
import { pickRows, type PickRow } from "./derive";

const INKS: [StreetInk, StreetInk][] = [
  ["signal", "night"],
  ["park", "night"],
  ["poster", "night"],
];
// A line that stops on a dangling word ("Catch the.") is a model slip; the proof cards show complete lines only.
const DANGLING = /\b(the|a|an|to|of|and|or|for|who's|with)\.$/i;

/** Three picks from distinct neighbourhoods whose chosen line reads as a complete sentence. */
export function proofPicks(rows: PickRow[]): PickRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.neighbourhood) || !r.line || DANGLING.test(r.line.trim())) return false;
    seen.add(r.neighbourhood);
    return true;
  }).slice(0, 3);
}

/** "From the sample plan": night cards with a diagonal street, a real copy line and the face it runs on (no testimonials). */
export function ProofCards() {
  const s = useSample();
  const picks = s.plan.status === "ready" ? proofPicks(pickRows(s.plan.data)) : null;
  return (
    <PinstripeSection labelledBy="proof-h" testId="landing-proof" className="py-20 sm:py-28">
      <div className="wrap">
        <SectionHeading
          id="proof-h"
          eyebrow="From the sample plan"
          title={
            <>
              Lines written for the <Em>block</Em> they stand on.
            </>
          }
          lede="Each line below is the one the sample plan runs on that face, written by Nemotron 3.5 Lightning and signed off by NeMo Guardrails."
        />
        <InView className="mt-12 grid gap-4 md:grid-cols-3">
          {(picks ?? [null, null, null]).map((r, i) => (
            <article key={r?.faceId ?? i} className="ws-fade-up relative flex min-h-[420px] flex-col overflow-hidden rounded-lg bg-night p-6 text-on-night" style={{ "--delay": `${i * 140}ms` } as CSSProperties}>
              <StreetCanvas viewBox="0 0 360 200" fit="slice" className="absolute inset-x-0 top-[52px] h-[130px]">
                <Street points={[[-20, 150], [110, 150], [190, 70], [380, 70]]} lanes={[{ ink: INKS[i][0], line: "dot", lineInk: INKS[i][1] }, { ink: INKS[i][0], line: "dash", lineInk: INKS[i][1] }]} gap={4} width={16} edge="#22211d" radius={44} delay={200 + i * 140} />
              </StreetCanvas>
              {r ? (
                <>
                  <p className="relative font-mono text-micro text-on-night-muted">
                    {String(r.rank).padStart(2, "0")} · {r.neighbourhood}
                  </p>
                  <blockquote className="relative mt-auto text-h4 leading-snug">&ldquo;{r.line}&rdquo;</blockquote>
                  <p className="relative mt-3 text-micro text-on-night-muted">
                    Block over-indexes on {r.lifts.slice(0, 2).map((l) => `${l.tag}${l.lift ? ` (${l.lift})` : ""}`).join(" and ")}
                  </p>
                  <footer className="relative mt-6 flex items-center justify-between gap-3 border-t border-night-line pt-4">
                    <Link href={faceHref(SAMPLE_PLAN_ID, r.faceId)} className="min-w-0 text-small hover:underline">
                      <span className="block font-mono text-micro">{r.faceId}</span>
                      <span className="block truncate text-micro text-on-night-muted">{r.name} · {kindName(r.kind)}</span>
                    </Link>
                    {r.nemoPass ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-park px-2 py-0.5 text-micro text-[#22211d]">
                        <Shield size={13} /> NeMo
                      </span>
                    ) : null}
                  </footer>
                </>
              ) : (
                <div className="relative mt-auto flex flex-col gap-2">
                  {s.plan.status === "error" ? <p className="text-small text-on-night-muted">The sample plan did not load here.</p> : <><Skeleton className="h-6 w-full !bg-night-2" /><Skeleton className="h-6 w-2/3 !bg-night-2" /></>}
                </div>
              )}
            </article>
          ))}
        </InView>
      </div>
    </PinstripeSection>
  );
}
