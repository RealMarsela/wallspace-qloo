"use client";

import Link from "next/link";
import { useState } from "react";
import type { AudienceCard, Face, MediaOwner } from "@/contract";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { IconChip } from "@/components/ui/IconChip";
import { Send } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Listbox } from "@/components/ui/Listbox";
import { useAsync } from "@/components/ui/useAsync";
import { api } from "@/lib/api-client";
import { pitchSheet, sendPitch } from "./owner-api";
import { cleanBrand } from "./owner-format";
import { PitchPreview, pitchSubject } from "./PitchPreview";
import { PitchResult, type SendState } from "./PitchResult";
import { PROVIDERS, noteFor, providerMeta, type Provider } from "./pitch-providers";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pitch flow for one face: choose Gmail, Outlook or Slack, the brand, the recipient and a note; preview the exact
 *  message; confirm; see the result. Nothing is sent before the confirm dialog's Send button. */
export function PitchSheet({ face, card, owner }: { face: Face; card: AudienceCard; owner: MediaOwner | null }) {
  const conns = useAsync(() => api.connections(), "connections");
  const status = (p: Provider) => conns.data?.connections.find((c) => c.provider === p);
  const firstConnected = PROVIDERS.find((p) => status(p)?.status === "connected");
  const [picked, setPicked] = useState<Provider | null>(null);
  const provider = picked ?? firstConnected ?? "gmail";
  const conn = status(provider);
  const connected = conn?.status === "connected";

  const [brand, setBrand] = useState(card.brands[0]?.name ?? "");
  const [to, setTo] = useState("");
  const [note, setNote] = useState(() => noteFor(cleanBrand(card.brands[0]?.name ?? ""), face.name, face.neighbourhood));
  const [noteTouched, setNoteTouched] = useState(false);
  const [toTouched, setToTouched] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [state, setState] = useState<SendState>({ status: "idle" });

  const mail = provider !== "slack";
  const toError = mail && toTouched && !EMAIL.test(to) ? "Enter the brand contact's e-mail, like partnerships@brand.com." : null;
  const ready = connected && (!mail || EMAIL.test(to)) && note.length <= 2000;
  const ownerName = owner?.name ?? "the media owner";

  function chooseProvider(p: Provider) {
    // A mail address is not a Slack channel (and back): clear the recipient when the kind of destination changes.
    if ((p === "slack") !== (provider === "slack")) {
      setTo("");
      setToTouched(false);
    }
    setPicked(p);
  }
  function chooseBrand(b: string) {
    setBrand(b);
    if (!noteTouched) setNote(noteFor(cleanBrand(b), face.name, face.neighbourhood));
  }
  function review() {
    setToTouched(true);
    if (ready) setConfirm(true);
  }
  async function send() {
    setConfirm(false);
    setState({ status: "sending" });
    try {
      const r = await sendPitch(face.id, { provider, to: mail ? to : to.trim() || null, note: note.trim() || null });
      setState({ status: "sent", provider, to: mail ? to : to.trim() || "default channel", externalId: r.externalId });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Could not send." });
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([pitchSheet(face, card, ownerName)], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallspace-pitch-${face.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const subject = pitchSubject(face, owner, card);
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${note}\n\n${pitchSheet(face, card, ownerName)}`)}`;

  return (
    <section data-testid="pitch-sheet" aria-labelledby="pitch-h" className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <IconChip ink="cobalt"><Send /></IconChip>
        <div>
          <h2 id="pitch-h" className="text-h4">Pitch this face</h2>
          <p className="mt-1 text-small text-muted">Send the audience card to a brand by Gmail or Outlook, or share it with your team in Slack.</p>
        </div>
      </div>

      {state.status === "sent" || state.status === "error" ? (
        <PitchResult state={state} onReset={() => setState({ status: "idle" })} onRetry={send} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-small text-ink">Send with</span>
              <SegmentedControl
                label="Send with"
                testId="pitch-provider"
                value={provider}
                onChange={(id) => chooseProvider(id as Provider)}
                items={PROVIDERS.map((p) => ({
                  id: p,
                  testId: `pitch-provider-${p}`,
                  // eslint-disable-next-line @next/next/no-img-element
                  icon: <img src={providerMeta[p].logo} alt="" className="size-4" />,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      {providerMeta[p].name}
                      <i aria-hidden className={`size-1.5 rounded-full ${status(p)?.status === "connected" ? "bg-park" : "bg-line-2"}`} />
                      <span className="sr-only">{status(p)?.status === "connected" ? "connected" : "not connected"}</span>
                    </span>
                  ),
                }))}
              />
              <ProviderNote loading={conns.status === "loading"} failed={conns.status === "error"} connected={connected} account={conn?.account ?? null} name={providerMeta[provider].name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-small text-ink">Brand to pitch</span>
              {card.brands.length ? (
                <Listbox
                  label="Brand to pitch"
                  testId="pitch-brand"
                  value={brand}
                  onChange={chooseBrand}
                  options={card.brands.map((b) => ({ value: b.name, label: cleanBrand(b.name), hint: `affinity ${b.score.toFixed(2)}${/\(sample\)/i.test(b.name) ? " · sample" : ""}` }))}
                />
              ) : (
                <p data-testid="pitch-brand" className="rounded-md border border-dashed border-line px-3 py-2.5 text-small text-muted">No brands on this card. The note can still name one.</p>
              )}
              <p className="text-micro text-muted">The note names this brand. Qloo says its fans over-index here.</p>
            </div>

            {mail ? (
              <Field label="Brand contact e-mail" htmlFor="pitch-to" error={toError}>
                <Input id="pitch-to" data-testid="pitch-to" type="email" inputMode="email" autoComplete="off" value={to} aria-invalid={Boolean(toError)} onChange={(e) => setTo(e.target.value)} onBlur={() => setToTouched(true)} placeholder="partnerships@brand.com" />
              </Field>
            ) : (
              <Field label="Slack channel (optional)" htmlFor="pitch-to" hint="Leave empty to post to your workspace's default channel.">
                <Input id="pitch-to" data-testid="pitch-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="#sales-atlanta" />
              </Field>
            )}

            <Field label="Note" htmlFor="pitch-note" hint={`${note.length} of 2000 characters. It sits above the audience card in the message.`} error={note.length > 2000 ? "Keep the note under 2000 characters." : null}>
              <Textarea id="pitch-note" data-testid="pitch-note" rows={5} value={note} onChange={(e) => { setNote(e.target.value); setNoteTouched(true); }} />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button data-testid="pitch-send" variant="primary" arrow onClick={review} disabled={!connected || state.status === "sending"}>
                {state.status === "sending" ? "Sending…" : mail ? "Review and send" : "Review and share"}
              </Button>
              {mail ? <a data-testid="pitch-mailto" href={mailto} className="inline-flex h-10 items-center rounded-md px-3 text-small text-ink-2 underline-offset-4 hover:underline">Open in my mail app</a> : null}
              <button data-testid="pitch-download" type="button" onClick={download} className="inline-flex h-10 items-center rounded-md px-3 text-small text-ink-2 underline-offset-4 hover:underline">Download sheet</button>
            </div>
            <p data-testid="pitch-status" data-state={state.status} role="status" className="sr-only">{state.status === "sending" ? "Sending the pitch" : ""}</p>
          </div>
          <PitchPreview provider={provider} face={face} owner={owner} card={card} to={to} note={note} account={conn?.account ?? null} />
        </div>
      )}

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        testId="pitch-confirm-dialog"
        title={mail ? `Send this pitch from ${providerMeta[provider].name}?` : "Share this pitch in Slack?"}
        description={mail ? "It goes out as a real e-mail from your connected account." : "It posts as a message from the Wallspace app."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} data-testid="pitch-confirm-cancel">Keep editing</Button>
            <Button variant="primary" arrow onClick={send} data-testid="pitch-confirm">{mail ? "Send pitch" : "Share pitch"}</Button>
          </>
        }
      >
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-2 text-small">
          <dt className="text-muted">To</dt><dd className="break-words">{mail ? to : to.trim() || "default channel"}</dd>
          <dt className="text-muted">From</dt><dd className="break-words">{conn?.account ?? providerMeta[provider].name}</dd>
          <dt className="text-muted">Face</dt><dd>{face.id} · {face.name}</dd>
          <dt className="text-muted">Brand</dt><dd>{cleanBrand(brand) || "none"}</dd>
        </dl>
      </Modal>
    </section>
  );
}

function ProviderNote({ loading, failed, connected, account, name }: { loading: boolean; failed: boolean; connected: boolean; account: string | null; name: string }) {
  if (loading) return <p className="text-micro text-muted">Checking your connections…</p>;
  if (failed) return <p className="text-micro text-guard">Could not read your connections. Reload to try again.</p>;
  if (connected) return <p data-testid="pitch-provider-account" className="text-micro text-muted">Sends from {account ?? `your ${name} account`}.</p>;
  return (
    <p className="text-micro text-signal-deep">
      {name} is not connected.{" "}
      <Link data-testid="pitch-link-connections" className="underline underline-offset-4" href="/app/connections">Connect it on Connections</Link>
    </p>
  );
}
