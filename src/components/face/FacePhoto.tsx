"use client";
import { useState } from "react";
import type { Face } from "@/contract";

/** Site photo with its credit directly under it. The frame holds its 4:3 box on the panel colour and the image fades in when
 *  it has loaded, so nothing flashes grey. Renders nothing when the face has no photo. */
export function FacePhoto({ face }: { face: Face }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!face.photoUrl) return null;
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-line bg-panel">
        {failed ? (
          <span className="absolute inset-0 grid place-items-center p-4 text-center text-micro text-muted">The site photo did not load.</span>
        ) : (
          // Plain <img>: photos come from our own API route and Commons, sizes vary.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-testid="face-photo"
            src={face.photoUrl}
            alt={`Street view near ${face.name}`}
            decoding="async"
            ref={(el) => {
              if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
            }}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>
      {face.photoCredit ? (
        <figcaption data-testid="face-photo-credit" className="break-words text-micro text-muted">
          {face.photoCredit}
        </figcaption>
      ) : null}
    </figure>
  );
}
