"use client";
import Link from "next/link";
import type { Face } from "@/contract";
import { faceRatio } from "@/components/board/FaceBox";
import { Listbox, type ListOption } from "@/components/ui/Listbox";
import { SampleStamp, Tag, inkVar, type Ink } from "@/components/ui/Pill";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ArrowRight } from "@/components/ui/icons";
import { aff, kindName } from "@/components/ui/format";
import { faceHref } from "@/lib/routes";
import { liftsFor, type Block } from "./compare-derive";

const TAG_INKS: Ink[] = ["signal", "lilac", "park", "cobalt", "poster"];

/** The face at its true proportion, ringed in the block's street ink, on a post, with the line it carries. */
function BillboardFace({ face, line, ink, testId }: { face: Face; line: string | null; ink: string; testId: string }) {
  const { w, h } = faceRatio(face.kind, face.widthFt, face.heightFt);
  const portrait = h > w;
  return (
    <div className="flex flex-col items-center">
      <div
        data-testid={testId}
        data-kind={face.kind}
        role="img"
        aria-label={line ? `Face reads: ${line}` : "No line written for this face"}
        className={`grid w-full place-items-center rounded-md border-[3px] bg-surface p-3 text-center ${portrait ? "max-w-[150px]" : "max-w-[460px]"}`}
        style={{ aspectRatio: `${w} / ${h}`, borderColor: ink }}
      >
        {line ? (
          <span className="font-display text-[clamp(1rem,0.8rem+0.8vw,1.35rem)] leading-tight tracking-[-0.01em] text-ink">{line}</span>
        ) : (
          <span className="text-small text-muted">No line: not picked for this plan</span>
        )}
      </div>
      <i aria-hidden className="block h-4 w-2.5 rounded-b-[2px]" style={{ background: ink }} />
    </div>
  );
}

export function BlockCard({
  side,
  block,
  options,
  planId,
  onPick,
  ink,
  hotter,
}: {
  side: "a" | "b";
  block: Block;
  options: ListOption[];
  planId: string;
  onPick: (id: string) => void;
  ink: Ink;
  hotter: boolean;
}) {
  const { face, pick } = block;
  const line = pick ? (pick.copy[pick.chosenCopy]?.text ?? null) : null;
  const lifts = liftsFor(block);
  const color = inkVar[ink as keyof typeof inkVar] ?? "var(--line)";
  return (
    <section
      data-testid={`compare-block-${side}`}
      data-face-id={face.id}
      aria-label={`Block ${side.toUpperCase()}: ${face.neighbourhood}`}
      className={`flex min-w-0 flex-col overflow-hidden rounded-lg border bg-surface ${hotter ? "border-ink shadow-md" : "border-line"}`}
    >
      <div className="flex flex-col gap-2 border-b border-line bg-panel px-4 py-3">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span className="eyebrow flex items-center gap-2">
            <i aria-hidden className="size-2.5 rounded-xs" style={{ background: color }} />
            Block {side.toUpperCase()}
          </span>
          {hotter ? <Tag ink="park" dot>Hotter block</Tag> : null}
        </div>
        <Listbox value={face.id} onChange={onPick} options={options} label={`Face for block ${side.toUpperCase()}`} searchable testId={`compare-select-${side}`} size="sm" />
      </div>
      <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
        <BillboardFace face={face} line={line} ink={color} testId={`compare-face-${side}`} />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-2">
          <span className="text-ink">{face.neighbourhood}</span>
          <span className="text-muted">·</span>
          <span>{kindName(face.kind)}</span>
          <span className="font-mono text-micro text-muted">{face.id}</span>
          {face.location === "sample" ? <SampleStamp>sample face</SampleStamp> : null}
        </div>
        <div data-testid={`compare-affinity-${side}`} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-small text-muted">Audience affinity</span>
            <strong className="font-mono text-h3 font-medium tabular-nums">{aff(block.affinity)}</strong>
          </div>
          <ScoreBar value={block.affinity} tone={hotter ? "picked" : "heat"} label={`Audience affinity ${aff(block.affinity)}`} />
          <span className="text-micro text-muted">
            Pick {pick?.rank}: Qloo heatmap affinity of the cell this face sits in
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small text-muted">What this block over-indexes on</span>
          <div data-testid={`compare-tags-${side}`} className="flex flex-wrap gap-1.5">
            {lifts.length ? (
              lifts.map((l, i) => (
                <Tag key={l.tag} ink={TAG_INKS[i % TAG_INKS.length]} title={l.lift ? `${l.lift} vs Atlanta` : undefined}>
                  {l.tag}
                  {l.lift ? <b className="font-mono font-medium">{l.lift}</b> : null}
                </Tag>
              ))
            ) : (
              <span className="text-small text-muted">Block tastes are fetched for picked faces only.</span>
            )}
          </div>
        </div>
        {pick ? (
          <Link href={faceHref(planId, face.id)} data-testid={`compare-open-${side}`} className="group mt-auto inline-flex items-center gap-1.5 self-start text-small text-ink underline-offset-4 hover:underline">
            Open the face sheet
            <ArrowRight size={15} className="ws-arrow" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
