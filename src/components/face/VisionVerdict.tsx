import type { Face, Pick } from "@/contract";
import type { PhotoRead as RunRead } from "@/components/landing/derive";
import { ModelChip } from "@/components/ui/ModelChip";
import { Tag, type Ink } from "@/components/ui/Pill";
import { Viewfinder } from "@/components/ui/icons";

interface Read {
  sightline: string;
  clutter: string;
  share: number | null;
  note: string;
  dropped: boolean;
  model: string | null;
}

const sightInk: Record<string, Ink> = { clear: "park", partial: "signal", blocked: "poster" };
const clutterInk: Record<string, Ink> = { low: "park", medium: "signal", high: "poster" };

/** Nemotron 3.5 Super VL's read of the site photo: sightline, clutter, how much of the frame the face fills, its note, and
 *  whether the read kept or dropped the face. Uses the pick's stored read, else the run log's (dropped faces have no pick). */
export function VisionVerdict({ face, pick, runRead }: { face: Face; pick: Pick | null; runRead: RunRead | null }) {
  const r: Read | null = pick?.photoRead
    ? { sightline: pick.photoRead.sightline, clutter: pick.photoRead.clutter, share: pick.photoRead.faceShareOfFrame, note: pick.photoRead.note, dropped: false, model: runRead?.model ?? null }
    : runRead
      ? { sightline: runRead.sightline, clutter: runRead.clutter, share: runRead.share, note: runRead.note, dropped: runRead.dropped || !pick, model: runRead.model }
      : null;
  return (
    <section aria-label="Site photo read" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-small text-ink">
          <Viewfinder size={16} className="text-muted" /> Site photo read · Nemotron 3.5 Super VL
        </h2>
        <ModelChip role="super-vl" model={r?.model ?? "nvidia/Nemotron-3.5-Super-VL"} />
      </div>
      <div data-testid="face-photo-read" data-sightline={r?.sightline ?? "none"} data-dropped={r?.dropped ?? false} className="flex flex-col gap-2.5">
        {r ? (
          <>
            <p className={`text-body ${r.dropped ? "text-poster-deep" : "text-ink"}`}>{r.dropped ? "Dropped by the vision read" : `Kept: ${r.sightline} sightline`}</p>
            <div className="flex flex-wrap gap-1.5">
              <Tag ink={sightInk[r.sightline] ?? "neutral"} dot>
                {r.sightline} sightline
              </Tag>
              <Tag ink={clutterInk[r.clutter] ?? "neutral"} dot>
                {r.clutter} clutter
              </Tag>
              {r.share !== null ? <Tag>face fills {Math.round(r.share * 100)}% of frame</Tag> : null}
            </div>
            {r.note ? <p className="text-small text-muted">{r.note}</p> : null}
          </>
        ) : (
          <p className="text-small text-muted">
            {face.photoUrl ? "The planner chose which site photos to read for this plan; this one was not among them." : "No site photo for this face, so there was nothing to read."}
          </p>
        )}
      </div>
    </section>
  );
}
