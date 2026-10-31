"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { ArrowLeft, ArrowUpRight, Check } from "@/components/ui/icons";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAsync } from "@/components/ui/useAsync";
import { api } from "@/lib/api-client";
import { AudienceCardBody } from "./AudienceCard";
import { DataLabels } from "./CardParts";
import { fetchCard } from "./owner-api";
import { faceSpecs, publicCardHref } from "./owner-format";
import { PitchSheet } from "./PitchSheet";

/** Card + owner for one face (shared by the in-app card and the public page). */
export function useAudienceCard(faceId: string) {
  return useAsync(async () => {
    const [c, inv] = await Promise.all([fetchCard(faceId), api.faces()]);
    return { ...c, owner: inv.owners.find((o) => o.id === c.face.ownerId) ?? null };
  }, faceId);
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div data-testid="card-loading" className={`flex flex-col gap-5 ${className}`} role="status" aria-label="Loading the audience card">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-6 w-80 max-w-full" />
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[420px]" />
      </div>
      <Skeleton className="h-56" />
    </div>
  );
}

/** In-app audience card for a media owner: header with actions, the card, then the pitch flow. */
export function AudienceCardView({ faceId }: { faceId: string }) {
  const res = useAudienceCard(faceId);
  if (res.status === "loading") return <CardSkeleton className="pt-6 lg:pt-14" />;
  if (res.status === "error")
    return (
      <div className="py-10">
        <ErrorState
          title="This audience card did not load"
          message={res.error.message}
          action={
            <span className="flex flex-wrap gap-2">
              <Button variant="primary" data-testid="card-retry" onClick={res.retry}>Try again</Button>
              <LinkButton href="/app/owner" variant="ghost">Back to inventory</LinkButton>
            </span>
          }
        />
      </div>
    );
  const { face, owner, card, source } = res.data;
  return (
    <article data-testid="audience-card" data-face-id={face.id} className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <>
            <Link data-testid="card-back" href="/app/owner" className="group inline-flex items-center gap-1 text-ink-2 hover:text-ink">
              <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" /> Inventory
            </Link>
            <span aria-hidden>/</span>
            <span>Audience card · {face.id}</span>
          </>
        }
        title={face.name}
        lede={`${face.neighbourhood}, Atlanta · ${faceSpecs(face)}`}
        actions={
          <>
            <CopyLink faceId={face.id} />
            <LinkButton href={publicCardHref(face.id)} variant="ghost" size="sm" external testId="card-open-public">
              Public card <ArrowUpRight size={15} />
            </LinkButton>
          </>
        }
        meta={<DataLabels face={face} source={source} />}
      />
      <AudienceCardBody data={res.data} owner={owner} />
      <PitchSheet face={face} card={card} owner={owner} />
    </article>
  );
}

function CopyLink({ faceId }: { faceId: string }) {
  const [done, setDone] = useState<"idle" | "ok" | "fail">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicCardHref(faceId)}`);
      setDone("ok");
    } catch {
      setDone("fail");
    }
    window.setTimeout(() => setDone("idle"), 2200);
  }
  return (
    <Button variant="ghost" size="sm" onClick={copy} data-testid="card-copy-link" aria-live="polite">
      {done === "ok" ? <><Check size={15} /> Link copied</> : done === "fail" ? "Copy failed" : "Copy public link"}
    </Button>
  );
}
