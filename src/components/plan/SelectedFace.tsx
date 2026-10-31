import { FaceBox } from "@/components/board/FaceBox";
import { TextLink } from "@/components/ui/Button";
import { SampleStamp, Tag, type Ink } from "@/components/ui/Pill";
import { aff, kindName, usd } from "@/components/ui/format";
import { faceHref } from "@/lib/routes";
import { CheckChips } from "./CheckChips";
import type { PickChecks, PickRow } from "./plan-derive";

const INKS: Ink[] = ["signal", "lilac", "park", "cobalt", "poster"];

/** The selected pick beside the map: its face with the chosen line, the block's tags, checks and a link to the face sheet. */
export function SelectedFace({ row, planId, checks }: { row: PickRow; planId: string; checks: PickChecks }) {
  const { pick, face } = row;
  const line = pick.copy[pick.chosenCopy]?.text ?? null;
  return (
    <section data-testid="selected-face" data-face-id={pick.faceId} aria-label={`Selected face ${pick.faceId}`} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-mono text-micro text-muted">
            #{String(pick.rank).padStart(2, "0")} · {pick.faceId}
          </span>
          <span className="block truncate text-body text-ink">{face?.name ?? pick.faceId}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-body tabular-nums">{aff(pick.affinity)}</span>
          <span className="block text-[0.68rem] text-muted">affinity</span>
        </span>
      </div>
      {face ? <FaceBox kind={face.kind} widthFt={face.widthFt} heightFt={face.heightFt} text={line} testId="selected-face-box" /> : null}
      {face ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-muted">
          <span>{face.neighbourhood}</span>·
          <span>
            {kindName(face.kind)} {face.heightFt}×{face.widthFt} ft
          </span>
          ·<span>{usd(pick.costUsd)} flight</span>
          {face.location === "sample" ? <SampleStamp>sample face</SampleStamp> : null}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        {pick.topTags.slice(0, 4).map((t, i) => (
          <Tag key={t} ink={INKS[i % INKS.length]}>
            {t}
          </Tag>
        ))}
      </div>
      <CheckChips checks={checks} faceId={`sel-${pick.faceId}`} />
      <TextLink href={faceHref(planId, pick.faceId)} testId="selected-face-open">
        Open the face sheet
      </TextLink>
    </section>
  );
}
