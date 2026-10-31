"use client";
import type { CSSProperties } from "react";
import { Tag } from "@/components/ui/Pill";
import { ms as fmtMs } from "@/components/ui/format";
import { useSample } from "../data";
import { photoReads, type PhotoRead } from "../derive";
import { MediaFrame, MediaLoading, usdTiny } from "./MediaFrame";

/** A schematic viewfinder per site-photo read: the face drawn at its measured share of the frame, obstructions for a
 *  partial sightline, and the verdict from the run log (dropped or kept). */
function Viewfinder({ r, delay }: { r: PhotoRead; delay: number }) {
  const share = r.share ?? 0.2;
  const fw = Math.max(18, Math.sqrt(share) * 200 * 1.6);
  const fh = fw / 3;
  const x = 100 - fw / 2;
  const y = 52 - fh / 2;
  return (
    <svg viewBox="0 0 200 110" className="block w-full rounded-md bg-panel" aria-hidden>
      <path d="M0 92 L200 74" stroke="var(--line)" strokeWidth="10" />
      <path d="M0 92 L200 74" stroke="var(--surface)" strokeWidth="1.2" strokeDasharray="6 6" />
      <rect x={x} y={y} width={fw} height={fh} rx="2" fill="var(--park)" stroke="#22211d" strokeWidth="1.5" />
      <rect x={99} y={y + fh} width="2.4" height={78 - y - fh} fill="#22211d" />
      {r.sightline !== "clear" ? (
        <g stroke="var(--ink-2)" strokeWidth="1.4">
          <line x1={x + fw * 0.3} y1="6" x2={x + fw * 0.3 + 2} y2="100" strokeWidth="3" />
          <path d={`M0 28 Q100 ${y + fh * 0.6} 200 22`} fill="none" />
          <path d={`M0 34 Q100 ${y + fh * 0.9} 200 30`} fill="none" />
        </g>
      ) : null}
      <g fill="none" stroke="#22211d" strokeWidth="1.6">
        <path d="M8 22V8h14M178 8h14v14M192 88v14h-14M22 102H8V88" />
      </g>
      <rect className="ws-scan" x="8" y="8" width="184" height="2" fill="var(--cobalt)" opacity="0.7" style={{ "--delay": `${delay}ms` } as CSSProperties} />
    </svg>
  );
}

export function PhotoMedia() {
  const s = useSample();
  const reads = s.run.status === "ready" ? photoReads(s.run.data).slice(0, 2) : null;
  const first = reads?.[0];
  return (
    <MediaFrame title="Site photo reads" meta={first?.model ? "Nemotron 3.5 Super VL" : undefined}>
      {!reads ? (
        <MediaLoading failed={s.run.status === "error"} />
      ) : reads.length === 0 ? (
        <p className="p-4 text-small text-muted">This run read no site photos.</p>
      ) : (
        <div className="grid h-full grid-cols-1 gap-3 overflow-hidden p-3 sm:grid-cols-2 sm:p-4">
          {reads.map((r, i) => (
            <div key={r.faceId + i} className={`flex flex-col gap-2.5 ${i > 0 ? "hidden sm:flex" : ""}`}>
              <div className="relative">
                <Viewfinder r={r} delay={300 + i * 500} />
                <span className="ws-pop absolute right-2 top-2" style={{ "--delay": `${1500 + i * 500}ms` } as CSSProperties}>
                  <Tag ink={r.dropped ? "poster" : "park"} dot>
                    {r.dropped ? "Dropped" : "Kept"}
                  </Tag>
                </span>
              </div>
              <p className="font-mono text-micro">{r.faceId}</p>
              <dl className="grid grid-cols-3 gap-1.5 text-micro">
                {[
                  ["Sightline", r.sightline],
                  ["Clutter", r.clutter],
                  ["Face fills", r.share === null ? "not read" : `${Math.round(r.share * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xs bg-panel px-2 py-1.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className={`capitalize ${k === "Sightline" && v !== "clear" ? "text-poster-deep" : ""}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="line-clamp-2 text-micro text-muted">{r.note}</p>
              <p className="mt-auto font-mono text-[0.66rem] text-muted">
                {fmtMs(r.ms)} · {usdTiny(r.costUsd)}
              </p>
            </div>
          ))}
        </div>
      )}
    </MediaFrame>
  );
}
