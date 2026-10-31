"use client";
import { useState } from "react";
import type { Plan } from "@/contract";
import { Button, buttonClass } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { Calendar, ChevronDown, Send, Shield, Users } from "@/components/ui/icons";
import { Download, Mail, Table } from "@/components/ui/icons-app";
import { api } from "@/lib/api-client";
import { SendSheet } from "./SendSheet";

type Note = { tone: "ok" | "err"; text: string } | null;

const destinations = [
  { id: "slack", label: "Slack approval", hint: "Approve or reject from the channel", icon: <Users size={16} /> },
  { id: "gmail", label: "Gmail", hint: "Email the plan with the picks table", icon: <Mail size={16} /> },
  { id: "outlook", label: "Outlook", hint: "Email the plan from Microsoft 365", icon: <Mail size={16} /> },
  { id: "hubspot", label: "HubSpot deal", hint: "Deal with the spend and faces", icon: <Users size={16} /> },
  { id: "google-sheets", label: "Google Sheets", hint: "One row per face plus a summary tab", icon: <Table size={16} /> },
  { id: "google-calendar", label: "Calendar", hint: "Creative due, posting and takedown", icon: <Calendar size={16} /> },
];

/** The plan's action bar: sign off (queues NeMo), send to a tool (menu, then the send sheet), export CSV or the OpenOOH venue
 *  list. Status notes appear under the bar and as a toast. */
export function PlanActions({ plan, onPlan }: { plan: Plan; onPlan: (p: Plan) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<"sign" | "csv" | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [send, setSend] = useState<{ open: boolean; provider: string | null }>({ open: false, provider: null });
  const signed = plan.status === "awaiting-nemo" || plan.status === "nemo-checked";
  const blocked = plan.status === "running" || plan.status === "failed";

  async function signOff() {
    setBusy("sign");
    setNote(null);
    try {
      const res = await api.signOff(plan.id);
      onPlan(res.plan);
      const text = `Signed off. ${res.queuedLines} lines passed the live guard and are queued for the NeMo Guardrails job, which we start on demand.`;
      setNote({ tone: "ok", text });
      toast({ kind: "ok", title: "Signed off for print", body: `${res.queuedLines} lines queued for NeMo Guardrails.` });
    } catch (e) {
      setNote({ tone: "err", text: e instanceof Error ? e.message : "Sign-off failed." });
    } finally {
      setBusy(null);
    }
  }

  async function exportCsv() {
    setBusy("csv");
    setNote(null);
    try {
      const blob = await api.exportCsv(plan.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wallspace-${plan.id}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ kind: "ok", title: "CSV downloaded", body: `wallspace-${plan.id}.csv` });
    } catch (e) {
      setNote({ tone: "err", text: e instanceof Error ? e.message : "Export failed." });
    } finally {
      setBusy(null);
    }
  }

  const signLabel = plan.sample && !signed ? "Sample is read-only" : signed ? (plan.status === "nemo-checked" ? "NeMo-checked" : "Signed off") : busy === "sign" ? "Signing off…" : "Sign off for print";
  return (
    <div id="plan-actions" className="flex flex-col gap-2" data-testid="plan-actions">
      <div className="flex flex-wrap items-center gap-2">
        <Button data-testid="action-sign-off" variant="primary" onClick={signOff} disabled={busy !== null || signed || blocked || plan.sample} title={plan.sample ? "The public sample plan cannot be signed off again." : undefined}>
          <Shield size={16} /> {signLabel}
        </Button>
        <Menu
          label="Send the plan"
          testId="action-send"
          placement="bottom-start"
          triggerClassName={buttonClass("ghost", "md")}
          trigger={
            <>
              <Send size={16} /> Send <ChevronDown size={14} className="-mr-1 text-muted" />
            </>
          }
          items={[
            { id: "h", heading: "Send to a connected tool" },
            ...destinations.map((d) => ({ id: d.id, label: d.label, hint: d.hint, icon: d.icon, testId: `send-menu-${d.id}`, onSelect: () => setSend({ open: true, provider: d.id }) })),
            { id: "s", separator: true },
            { id: "all", label: "All destinations…", testId: "send-menu-all", onSelect: () => setSend({ open: true, provider: null }) },
          ]}
        />
        <Menu
          label="Export the plan"
          testId="action-export"
          placement="bottom-start"
          triggerClassName={buttonClass("ghost", "md")}
          trigger={
            <>
              <Download size={16} /> {busy === "csv" ? "Exporting…" : "Export"} <ChevronDown size={14} className="-mr-1 text-muted" />
            </>
          }
          items={[
            { id: "csv", label: "CSV", hint: "One row per face, with copy and cost", icon: <Table size={16} />, testId: "action-export-csv", onSelect: () => void exportCsv(), disabled: busy !== null },
            { id: "ooh", label: "OpenOOH venue list", hint: "OpenRTB 2.6-shaped JSON for DOOH platforms", icon: <Download size={16} />, href: `/api/plans/${encodeURIComponent(plan.id)}/export.openooh.json`, external: true, testId: "action-export-openooh" },
          ]}
        />
      </div>
      <p data-testid="action-status" data-tone={note?.tone ?? ""} role="status" aria-live="polite" className={`text-micro empty:hidden ${note?.tone === "err" ? "text-guard" : "text-ink-2"}`}>
        {note?.text}
      </p>
      <SendSheet key={`${send.open}-${send.provider}`} planId={plan.id} open={send.open} initialProvider={send.provider} onClose={() => setSend({ open: false, provider: null })} />
    </div>
  );
}
