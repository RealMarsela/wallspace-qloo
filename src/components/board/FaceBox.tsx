import type { CSSProperties } from "react";
import type { Face } from "@/contract";

const defaults: Record<Face["kind"], { w: number; h: number }> = {
  bulletin: { w: 48, h: 14 },
  digital_bulletin: { w: 48, h: 14 },
  poster: { w: 22.8, h: 10.5 },
  bus_shelter: { w: 4, h: 6 },
  kiosk: { w: 3, h: 6 },
};

/** Width:height of a face. Street furniture is always portrait whatever order the inventory lists its sides. */
export function faceRatio(kind: Face["kind"], widthFt?: number, heightFt?: number) {
  const d = defaults[kind];
  const w = widthFt && widthFt > 0 ? widthFt : d.w;
  const h = heightFt && heightFt > 0 ? heightFt : d.h;
  const portrait = kind === "bus_shelter" || kind === "kiosk";
  return portrait ? { w: Math.min(w, h), h: Math.max(w, h) } : { w: Math.max(w, h), h: Math.min(w, h) };
}

/** A face drawn as the real thing at its true proportion: charcoal frame (visible on dark panels too), paper face, the copy line set large in Host Grotesk.
 *  `post` stands it on its pole (face sheet); without it the board sits flat in a card. Same palette in both themes,
 *  because a printed face does not change colour at night. */
export function FaceBox({
  kind,
  text,
  widthFt,
  heightFt,
  testId = "face-box",
  className = "",
  post = false,
}: {
  kind: Face["kind"];
  text: string | null;
  widthFt?: number;
  heightFt?: number;
  testId?: string;
  className?: string;
  post?: boolean;
}) {
  const { w, h } = faceRatio(kind, widthFt, heightFt);
  const portrait = h > w;
  const lit = kind === "digital_bulletin";
  return (
    <div className={`flex flex-col items-center ${portrait ? "mx-auto w-full max-w-[170px]" : "w-full"} ${className}`}>
      <div
        data-testid={testId}
        data-kind={kind}
        role="img"
        aria-label={text ? `Face reads: ${text}` : "No line written"}
        className="w-full rounded-md bg-night-line p-[6px] shadow-md"
        style={{ containerType: "inline-size" } as CSSProperties}
      >
        <div
          className={`relative grid h-full w-full place-items-center overflow-hidden rounded-[4px] px-[6%] text-center text-[#22211d] ${lit ? "bg-[#fffdf3]" : "bg-[#fbfaf7]"}`}
          style={{ aspectRatio: `${w} / ${h}` }}
        >
          {lit ? <i aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_209_46/0.22),transparent_70%)]" /> : null}
          <span
            className="relative font-display leading-[1.08] tracking-[-0.02em] [text-wrap:balance]"
            style={{ fontSize: portrait ? "clamp(0.9rem, 13cqw, 1.6rem)" : "clamp(0.85rem, 5.6cqw, 2.6rem)", fontWeight: 500 }}
          >
            {text ?? <span className="text-[0.8rem] font-normal text-[#6e6b63]">no line written</span>}
          </span>
        </div>
      </div>
      {post ? (
        <span aria-hidden className="flex flex-col items-center">
          <i className="block h-10 w-3 bg-night-line" />
          <i className="block h-1.5 w-12 rounded-t-[3px] bg-night-line" />
        </span>
      ) : null}
    </div>
  );
}
