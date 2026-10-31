"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BriefsResponse, type Brief, type MeResponse, type WorkspaceRole } from "@/contract";
import { fetchMe, notifyAuthChanged, sendJson } from "@/lib/auth-client";
import { BuyerFirst, DoneStep, OwnerFirst } from "@/app/app/onboarding/FinishSteps";
import { StepRail } from "@/app/app/onboarding/StepRail";
import { ToolsStep } from "@/app/app/onboarding/ToolsStep";
import { WorkspaceStep, WorkspaceSummary } from "@/app/app/onboarding/WorkspaceStep";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { Alert, ArrowLeft } from "@/components/ui/icons";
import { Em } from "@/components/ui/SectionHeading";
import { Skeleton } from "@/components/ui/States";

const ORDER = ["workspace", "tools", "first", "done"] as const;
const FORM = "onboarding-workspace";

/** Four-step onboarding: workspace, tools (skippable), first brief or faces, done. The API moves forward only, so Back
 *  opens a finished step for review; Next on the current step is the one that saves. */
export function Onboarding() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [view, setView] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const fresh = await fetchMe(true);
    setMe(fresh);
    notifyAuthChanged(fresh);
  }, []);
  useEffect(() => {
    void fetchMe().then(setMe, () => setError("Could not load your account."));
  }, []);

  const step = me?.onboarding.step;
  useEffect(() => {
    if (step !== "first" && step !== "done") return;
    void fetch("/api/briefs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { briefs: [] }))
      .then((j) => setBriefs(BriefsResponse.parse(j).briefs), () => undefined);
  }, [step, me?.onboarding.briefCount]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
      setView(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const createWorkspace = (name: string) => void run(() => sendJson("POST", "/api/workspaces", { name, role }));
  const advance = (to: "first" | "done", skipped: boolean) => void run(() => sendJson("PATCH", "/api/onboarding", { step: to, skipped }));

  if (!me)
    return (
      <PageFrame testId="onboarding-loading">
        <div className="flex flex-col gap-3 pb-6 pt-6 lg:pt-14" role="status" aria-label="Loading your setup">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="grid flex-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <Skeleton className="h-16 lg:h-[360px]" />
          <Skeleton className="h-[460px] !rounded-lg" />
        </div>
        {error ? <p role="alert" data-testid="onboarding-error" className="mt-4 text-small text-guard">{error}</p> : null}
      </PageFrame>
    );

  if (!me.user)
    return (
      <PageFrame testId="onboarding-signed-out">
        <PageHeader eyebrow="Set up" title="Sign in to set up your workspace" lede="Your workspace, tools and first brief are saved to your account." />
        <div><LinkButton href="/signin?next=/app/onboarding" variant="primary" arrow testId="onboarding-sign-in">Sign in</LinkButton></div>
      </PageFrame>
    );

  const current = Math.max(0, ORDER.indexOf(step ?? "workspace"));
  const viewing = view ?? current;
  const review = viewing < current;
  const { briefCount } = me.onboarding;
  const buyer = (me.workspace?.role ?? role) !== "media-owner";
  const stops = [
    { id: "workspace", label: "Workspace", hint: "Name and side" },
    { id: "tools", label: "Tools", hint: "Optional" },
    { id: "first", label: buyer ? "First brief" : "Your faces", hint: buyer ? "Or skip for now" : "The inventory" },
    { id: "done", label: "Done", hint: "Into the product" },
  ];
  const heads: [string, ReactNode][] = [
    ["Name your workspace", "Who you are and which side of the street you work. Atlanta is the demo city."],
    ["Connect your tools", "Optional. Plans and pitches go out through the tools your team already uses."],
    buyer ? ["Write your first brief", "A brief is all Wallspace needs to pick faces and write copy."] : ["Meet your faces", "Your inventory, with who lives around each face."],
    ["You are set up", "Pick where to start. Everything here is also in the sidebar."],
  ];
  const back = viewing > 0 ? () => setView(viewing - 1) : undefined;

  return (
    <PageFrame testId="onboarding">
      <PageHeader
        eyebrow={<>Set up · Stop {String(viewing + 1).padStart(2, "0")} of 04</>}
        title={buyer ? <>Four stops to your <Em>first</Em> plan</> : <>Four stops to your <Em>first</Em> pitch</>}
        lede="About two minutes. You can skip the optional stops and come back from the sidebar."
      />
      <p data-testid="onboarding-step" data-step={step} className="sr-only">Step: {step}</p>
      <div className="grid flex-1 content-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:content-stretch lg:gap-12">
        <div className="lg:sticky lg:top-10 lg:self-start lg:pt-2">
          <StepRail stops={stops} current={step === "done" ? stops.length : current} viewing={viewing} onView={(i) => setView(i === current ? null : i)} />
        </div>
        <section aria-labelledby="ob-step-h" data-testid="onboarding-panel" data-viewing={ORDER[viewing]} className="flex min-w-0 flex-col rounded-lg border border-line bg-surface shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-5 sm:px-8 sm:py-6">
            <div className="min-w-0">
              <p className="eyebrow">Stop {String(viewing + 1).padStart(2, "0")} · {stops[viewing].label}</p>
              <h2 id="ob-step-h" className="mt-2 text-h4 sm:text-[1.625rem] sm:leading-tight">{heads[viewing][0]}</h2>
              <p className="mt-1.5 text-small text-muted">{heads[viewing][1]}</p>
            </div>
            {review ? <span className="rounded-full bg-park-soft px-3 py-1 text-micro text-park-deep" data-testid="onboarding-review">Done · reviewing</span> : null}
          </header>

          <div key={viewing} className="ws-fade-up flex-1 px-5 py-6 sm:px-8" data-inview="true">
            {viewing === 0 ? review ? <WorkspaceSummary workspace={me.workspace} /> : <WorkspaceStep role={role} setRole={setRole} onCreate={createWorkspace} formId={FORM} /> : null}
            {viewing === 1 ? <ToolsStep /> : null}
            {viewing === 2 ? buyer ? <BuyerFirst briefs={briefs} briefCount={briefCount} /> : <OwnerFirst /> : null}
            {viewing === 3 ? <DoneStep workspace={me.workspace} buyer={buyer} /> : null}
          </div>

          <footer className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:px-8">
            {error ? (
              <p role="alert" data-testid="onboarding-error" className="flex items-start gap-2 rounded-md border border-poster/35 bg-poster-soft/40 px-3 py-2 text-small text-poster-deep">
                <Alert size={16} className="mt-0.5 shrink-0" /> {error}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <Button variant="quiet" onClick={back} disabled={!back || busy} data-testid="onboarding-back" className="self-start">
                <ArrowLeft size={16} /> Back
              </Button>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end [&>a]:flex-1 [&>button]:flex-1 sm:[&>a]:flex-none sm:[&>button]:flex-none">
                <Actions viewing={viewing} review={review} busy={busy} buyer={buyer} briefCount={briefCount} advance={advance} next={() => setView(viewing + 1 === current ? null : viewing + 1)} />
              </div>
            </div>
          </footer>
        </section>
      </div>
    </PageFrame>
  );
}

function Actions({ viewing, review, busy, buyer, briefCount, advance, next }: {
  viewing: number; review: boolean; busy: boolean; buyer: boolean; briefCount: number;
  advance: (to: "first" | "done", skipped: boolean) => void; next: () => void;
}) {
  if (review) return <Button variant="primary" arrow onClick={next} data-testid="onboarding-next">Next</Button>;
  if (viewing === 0)
    return <Button type="submit" form={FORM} variant="primary" arrow disabled={busy} data-testid="onboarding-create-workspace">{busy ? "Creating…" : "Create workspace"}</Button>;
  if (viewing === 1)
    return (
      <>
        <Button variant="ghost" disabled={busy} onClick={() => advance("first", true)} data-testid="onboarding-tools-skip">Skip for now</Button>
        <Button variant="primary" arrow disabled={busy} onClick={() => advance("first", false)} data-testid="onboarding-tools-continue">{busy ? "Saving…" : "Continue"}</Button>
      </>
    );
  if (viewing === 2) {
    const locked = buyer && briefCount === 0;
    return (
      <>
        {locked ? <span className="basis-full text-micro text-muted sm:basis-auto" id="ob-finish-hint">Save a brief to finish</span> : null}
        {buyer ? <Button variant="ghost" disabled={busy} onClick={() => advance("done", true)} data-testid="onboarding-skip-first">Skip this step</Button> : null}
        <Button variant="primary" arrow disabled={busy || locked} aria-describedby={locked ? "ob-finish-hint" : undefined} onClick={() => advance("done", false)} data-testid="onboarding-finish">{busy ? "Saving…" : "Finish"}</Button>
      </>
    );
  }
  return <LinkButton href={buyer ? "/app" : "/app/owner"} variant="primary" arrow testId="onboarding-done-link">{buyer ? "Go to your dashboard" : "Open your inventory"}</LinkButton>;
}
