"use client";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { LinkButton, TextLink } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { ModelChip } from "@/components/ui/ModelChip";
import { Layers, Refresh } from "@/components/ui/icons-app";
import { Gauge } from "@/components/ui/icons";
import { roleOrder } from "@/components/ui/models";
import { useAsync } from "@/components/ui/useAsync";
import { api } from "@/lib/api-client";
import { SAMPLE_RUN_ID, audienceCardHref, runHref } from "@/lib/routes";
import { GuardBand } from "./GuardBand";
import { ModelTable } from "./ModelTable";
import { RouteMap } from "./RouteMap";
import type { Variant } from "./steps";

/** In-app How it works: the route a brief takes (every model, guardrail and Qloo call, each linked to where it runs),
 *  the model table with what the sample run logged, and the taste-only band. Shared by /app/how and the public /sample/how. */
export function HowItWorks({ variant }: { variant: Variant }) {
  const run = useAsync(() => api.run(SAMPLE_RUN_ID), "sample-run");
  const steps = run.status === "ready" ? run.data.run.steps : run.status === "loading" ? "loading" : null;
  const also = [
    {
      icon: <Gauge size={18} />,
      ink: "cobalt" as const,
      title: "Live run trace",
      body: "Every step streams to the page as it runs, with model, tokens, time, cost and request ID.",
      href: runHref(SAMPLE_RUN_ID),
      cta: "Open the sample run",
    },
    {
      icon: <Refresh size={18} />,
      ink: "signal" as const,
      title: "Nightly re-scan",
      body: "A Cloudflare cron re-scores saved plans at 03:00 Kuala Lumpur time and flags faces whose audience has shifted.",
      href: "/sample",
      cta: "See the re-scan time on a plan",
    },
    {
      icon: <Layers size={18} />,
      ink: "park" as const,
      title: "Audience cards for media owners",
      body: "For each face: what the people around it love, and which brands' fans over-index there, from Qloo.",
      href: variant === "app" ? "/app/owner" : audienceCardHref("ATL-0116"),
      cta: variant === "app" ? "Open your inventory" : "Open an audience card",
    },
  ];
  return (
    <PageFrame testId="how-page">
      <PageHeader
        eyebrow="Learn"
        title="How a plan is made"
        lede="A brief goes through fourteen stops: a guard, four models on Nebius Token Factory (three NVIDIA Nemotron, one Qwen), Qloo taste data, Tavily, a NeMo Guardrails job and your tools."
        actions={
          <>
            <LinkButton href={runHref(SAMPLE_RUN_ID)} variant="ghost" testId="how-open-run">
              Watch the sample run
            </LinkButton>
            {variant === "app" ? (
              <LinkButton href="/app/new" variant="primary" arrow testId="how-new-brief">
                Write a brief
              </LinkButton>
            ) : (
              <LinkButton href="/signin" variant="primary" arrow testId="how-sign-in">
                Start free
              </LinkButton>
            )}
          </>
        }
        meta={
          <div className="flex flex-wrap gap-1.5" data-testid="how-legend">
            {roleOrder.map((r) => (
              <ModelChip key={r} role={r} tip={false} />
            ))}
          </div>
        }
      />
      <div className="flex flex-col gap-14">
        <RouteMap variant={variant} steps={steps} />
        <section aria-labelledby="also-title" className="flex flex-col gap-4">
          <h2 id="also-title" className="text-h4">
            Also running
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {also.map((a) => (
              <article key={a.title} className="flex flex-col gap-3 rounded-lg bg-panel p-5">
                <IconChip ink={a.ink}>{a.icon}</IconChip>
                <h3 className="text-h4">{a.title}</h3>
                <p className="flex-1 text-small text-muted">{a.body}</p>
                <TextLink href={a.href}>{a.cta}</TextLink>
              </article>
            ))}
          </div>
        </section>
        <ModelTable steps={steps} />
        <GuardBand variant={variant} />
      </div>
    </PageFrame>
  );
}
