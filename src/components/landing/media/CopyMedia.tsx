"use client";
import type { CSSProperties } from "react";
import { Tag } from "@/components/ui/Pill";
import { Check, Shield } from "@/components/ui/icons";
import { kindName } from "@/components/ui/format";
import { useSample } from "../data";
import { pickRows } from "../derive";
import { LIFT_INKS } from "../HeroWindow";
import { MediaFrame, MediaLoading } from "./MediaFrame";

/** One face from the sample plan: what its block over-indexes on, then its three lines typing in, each with the live
 *  guard result and the NeMo sign-off from the plan. */
export function CopyMedia() {
  const s = useSample();
  const row = s.plan.status === "ready" ? pickRows(s.plan.data)[0] : null;
  return (
    <MediaFrame title={row ? `${row.faceId} · ${row.neighbourhood}` : "A face and its lines"} meta={row ? kindName(row.kind) : undefined}>
      {!row ? (
        <MediaLoading failed={s.plan.status === "error"} />
      ) : (
        <div className="flex h-full flex-col gap-4 p-4">
          <div>
            <p className="eyebrow">What this block over-indexes on</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.lifts.slice(0, 3).map((l, i) => (
                <span key={l.tag} className="ws-pop" style={{ "--delay": `${200 + i * 120}ms` } as CSSProperties}>
                  <Tag ink={LIFT_INKS[i]}>
                    {l.tag}
                    {l.lift ? <b className="font-mono font-medium">{l.lift} vs Atlanta</b> : null}
                  </Tag>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow">Three lines · Nemotron 3.5 Lightning</p>
            <ol className="mt-2 flex flex-col gap-2">
              {row.lines.map((l, i) => {
                const d = 700 + i * 950;
                const chosen = l.text === row.line;
                return (
                  <li key={l.text + i} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${chosen ? "border-ink bg-surface" : "border-line bg-paper"}`}>
                    <span className="font-mono text-micro text-muted">{i + 1}</span>
                    <span className="ws-type min-w-0 flex-1 truncate text-small" style={{ "--delay": `${d}ms` } as CSSProperties}>
                      {l.text}
                    </span>
                    <span className="ws-pop flex shrink-0 gap-1" style={{ "--delay": `${d + 850}ms` } as CSSProperties}>
                      <span title="Live guard" className="inline-flex items-center gap-0.5 rounded-full bg-cobalt-soft px-1.5 py-0.5 text-[0.66rem] text-cobalt-deep">
                        <Check size={11} strokeWidth={2.2} /> guard
                      </span>
                      {l.nemo === "pass" ? (
                        <span title="NeMo Guardrails sign-off" className="inline-flex items-center gap-0.5 rounded-full bg-park-soft px-1.5 py-0.5 text-[0.66rem] text-park-deep">
                          <Shield size={11} /> NeMo
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="mt-auto text-micro text-muted">Outlined line: the one the plan runs on this face.</p>
        </div>
      )}
    </MediaFrame>
  );
}
