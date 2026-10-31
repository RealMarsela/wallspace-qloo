"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CreateBriefRequest } from "@/contract";
import { Button } from "@/components/ui/Button";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { Alert, Shield, Sparkle } from "@/components/ui/icons";
import { api } from "@/lib/api-client";
import { BriefAside } from "./BriefAside";
import { GuardNotice } from "./GuardNotice";
import { LovesInput } from "./LovesInput";
import { briefGaps, guardProbe, nextFlightStart, presets, samplePreset } from "./presets";
import { useLiveGuard } from "./useLiveGuard";

const BUDGETS = ["10000", "25000", "40000", "75000"];

function Section({ n, title, hint, children }: { n: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-lg border border-line bg-panel p-5 sm:p-6 md:grid-cols-[180px_minmax(0,1fr)]" aria-labelledby={`brief-${n}`}>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-micro text-muted">{n}</span>
        <h2 id={`brief-${n}`} className="text-h4">
          {title}
        </h2>
        <p className="text-small text-muted">{hint}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export function BriefForm() {
  const router = useRouter();
  const [preset, setPreset] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [loves, setLoves] = useState<string[]>([]);
  const [audienceText, setAudienceText] = useState("");
  const [budget, setBudget] = useState("");
  const [flightStart, setFlightStart] = useState(() => nextFlightStart());
  const [weeks, setWeeks] = useState(4);
  const [brandVoice, setBrandVoice] = useState("");
  const [busy, setBusy] = useState<null | "brief" | "plan">(null);
  const [error, setError] = useState<string | null>(null);
  const guard = useLiveGuard([audienceText, ...loves].join(". "), loves);
  const blocked = guard.phase === "done" && guard.verdict.status === "blocked";
  const budgetN = Number(budget.replace(/[^\d]/g, "")) || 0;

  function applyPreset(id: string) {
    const p = [samplePreset, ...presets].find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setError(null);
    setBrandName(p.brandName);
    setLoves(p.loves);
    setAudienceText(p.audienceText);
    setBrandVoice(p.brandVoice);
    if (p.budgetUsd) setBudget(String(p.budgetUsd));
    if (p.flightStart) setFlightStart(p.flightStart);
    if (p.flightWeeks) setWeeks(p.flightWeeks);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const gaps = briefGaps({ brandName, loves, audienceText, budgetUsd: budgetN });
    if (gaps.length) {
      setError(gaps.join(" "));
      return;
    }
    const input = CreateBriefRequest.safeParse({
      brandName: brandName.trim(),
      audienceText: audienceText.trim(),
      loves,
      budgetUsd: budgetN,
      flightStart,
      flightWeeks: weeks,
      brandVoice: brandVoice.trim() || null,
    });
    if (!input.success) {
      setError(input.error.issues.map((i) => `${i.path.join(".") || "brief"}: ${i.message}`).join("; "));
      return;
    }
    try {
      setBusy("brief");
      const { brief, guard: verdict } = await api.createBrief(input.data);
      if (verdict.status === "blocked") {
        setError(`The guard blocked this brief: ${verdict.reasons.join(" ")}`);
        return;
      }
      setBusy("plan");
      const { runId } = await api.startPlan(brief.id);
      router.push(`/app/runs/${encodeURIComponent(runId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the plan.");
    } finally {
      setBusy(null);
    }
  }

  const chip = (on: boolean) =>
    `inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-small transition-colors ${on ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:border-ink"}`;
  return (
    <form data-testid="brief-form" onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Start from a preset">
          <button
            type="button"
            data-testid="preset-sample"
            aria-pressed={preset === samplePreset.id}
            onClick={() => applyPreset(samplePreset.id)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-small transition-colors ${preset === samplePreset.id ? "border-park bg-park-soft text-park-deep" : "border-ink bg-ink text-paper hover:bg-ink-2"}`}
          >
            <Sparkle size={14} /> {samplePreset.label}
          </button>
          <span className="mx-1 text-small text-muted">or start from</span>
          {presets.map((p) => (
            <button key={p.id} type="button" data-testid={`preset-${p.id}`} aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)} className={chip(preset === p.id)}>
              <Sparkle size={14} /> {p.label}
            </button>
          ))}
          <button
            type="button"
            data-testid="preset-guard-probe"
            onClick={() => {
              setPreset(null);
              setAudienceText(guardProbe);
            }}
            title="See how the guard handles identity targeting"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-dashed border-poster/60 bg-poster-soft px-3.5 text-small text-poster-deep transition-colors hover:border-poster"
          >
            <Shield size={14} /> Test the guard
          </button>
        </div>

        <Section n="01" title="Brand" hint="Who the boards are for, and how they should sound.">
          <Field label="Brand name" htmlFor="brief-brand">
            <Input id="brief-brand" data-testid="brief-brand" value={brandName} placeholder="Porchlight Comedy Tour" onChange={(e) => {
                setBrandName(e.target.value);
                setPreset(null);
              }} required />
          </Field>
          <Field label="Brand voice (optional)" htmlFor="brief-voice" hint="Lightning writes every line in this voice.">
            <Input id="brief-voice" data-testid="brief-voice" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="warm, dry, a little cheeky" />
          </Field>
        </Section>

        <Section n="02" title="Audience" hint="Describe what the fans love. Wallspace finds the blocks where those tastes over-index.">
          <LovesInput value={loves} onChange={(v) => {
              setLoves(v);
              setPreset(null);
            }} />
          <Field label="Audience, in your words" htmlFor="brief-audience">
            <Textarea id="brief-audience" data-testid="brief-audience" value={audienceText} placeholder="people who would go to a comedy club on a Tuesday night" onChange={(e) => setAudienceText(e.target.value)} rows={3} maxLength={2000} className="min-h-0" />
          </Field>
          <GuardNotice state={guard} onUseSuggestion={(s) => setAudienceText(s)} />
        </Section>

        <Section n="03" title="Budget and flight" hint="Spend is split so no neighbourhood takes more than 30%.">
          <Field label="Budget (USD)" htmlFor="brief-budget">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="relative sm:w-48">
                <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <Input id="brief-budget" data-testid="brief-budget" inputMode="numeric" value={budgetN ? budgetN.toLocaleString("en-US") : ""} onChange={(e) => setBudget(e.target.value)} className="pl-7 font-mono tabular-nums" placeholder="40,000" />
              </span>
              <ToggleGroup label="Quick budgets" size="sm" testId="brief-budget-quick" value={[String(budgetN)]} onChange={(v) => setBudget(v[0] ?? budget)} items={BUDGETS.map((b) => ({ id: b, label: `$${Number(b) / 1000}k` }))} />
            </div>
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-small text-ink">Flight dates</span>
            <div className="sm:max-w-[360px]">
              <DateRangePicker start={flightStart} weeks={weeks} testId="brief-flight-start" weeksTestId="brief-weeks" onChange={(s, w) => {
                  setFlightStart(s);
                  setWeeks(w);
                }} />
            </div>
            <p className="text-micro text-muted">Pick the first and last day; outdoor books in whole weeks. City: Atlanta, the demo inventory.</p>
          </div>
        </Section>
      </div>

      <BriefAside
        brand={brandName}
        loves={loves}
        budget={budgetN}
        start={flightStart}
        weeks={weeks}
        footer={
          <div className="flex flex-col gap-2.5">
            {error ? (
              <p role="alert" data-testid="brief-error" className="flex items-start gap-2 rounded-md border border-poster/40 bg-poster-soft p-3 text-small text-poster-deep">
                <Alert size={16} className="mt-0.5 shrink-0" /> {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" size="lg" arrow data-testid="brief-submit" disabled={busy !== null || blocked} className="w-full">
              {busy === "brief" ? "Saving brief…" : busy === "plan" ? "Starting the run…" : "Start the plan"}
            </Button>
            <p className="text-center text-micro text-muted" data-testid="brief-submit-note">
              {blocked ? "Rephrase the audience as tastes to continue." : "You can watch every step live."}
            </p>
          </div>
        }
      />
    </form>
  );
}
