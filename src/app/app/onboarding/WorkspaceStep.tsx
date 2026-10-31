"use client";

import { useState, type FormEvent } from "react";
import type { Workspace, WorkspaceRole } from "@/contract";
import { Field, Input } from "@/components/ui/Field";
import { Billboard, Sparkle } from "@/components/ui/icons";
import { Tag } from "@/components/ui/Pill";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export const roleName: Record<WorkspaceRole, string> = { buyer: "Buys space (brand, agency or touring act)", "media-owner": "Sells space (media owner)" };

/** Step 1: name the workspace and pick a side. Validates on submit (no native bubbles); the API call stays in Onboarding. */
export function WorkspaceStep({ role, setRole, onCreate, formId }: { role: WorkspaceRole; setRole: (r: WorkspaceRole) => void; onCreate: (name: string) => void; formId: string }) {
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const clean = name.trim();
  const error = tried && (clean.length < 2 || clean.length > 80) ? (clean.length === 0 ? "Name your workspace to continue." : clean.length < 2 ? "Use at least 2 characters." : "Keep it under 80 characters.") : null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTried(true);
    if (clean.length >= 2 && clean.length <= 80) onCreate(clean);
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-6" data-testid="onboarding-workspace-form">
      <Field label="Workspace name" htmlFor="ws-name" hint="Your brand, agency, tour or media company. Teammates will see it." error={error}>
        <Input
          id="ws-name"
          data-testid="onboarding-workspace-name"
          name="name"
          value={name}
          maxLength={80}
          autoComplete="organization"
          aria-invalid={Boolean(error)}
          onChange={(e) => setName(e.target.value)}
          placeholder="Porchlight Comedy Tour"
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span id="ws-role" className="text-small text-ink">Which side are you on?</span>
        <SegmentedControl
          label="Which side are you on?"
          layout="cards"
          value={role}
          onChange={(v) => setRole(v as WorkspaceRole)}
          items={[
            {
              id: "buyer",
              testId: "onboarding-role-buyer",
              icon: <Sparkle size={18} className="text-muted" />,
              label: "I buy space",
              hint: "Brand, agency or touring act. Wallspace picks faces where your audience lives and writes copy for each one.",
            },
            {
              id: "media-owner",
              testId: "onboarding-role-media-owner",
              icon: <Billboard size={18} className="text-muted" />,
              label: "I sell space",
              hint: "Media owner. See who lives around each face, which brands to pitch, and send the pitch sheet.",
            },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel px-4 py-3 text-small">
        <span className="text-muted">City</span>
        <span className="text-ink">Atlanta</span>
        <Tag ink="signal">Demo city</Tag>
        <span className="basis-full text-micro text-muted sm:basis-auto sm:pl-2">More cities need their own Qloo baseline; Atlanta is the one we built.</span>
      </div>
    </form>
  );
}

/** Step 1 again, after it is done: what was set. The API has no edit, so this is read-only. */
export function WorkspaceSummary({ workspace }: { workspace: Workspace | null }) {
  const rows: [string, string][] = [
    ["Workspace", workspace?.name ?? "Not set"],
    ["Side", workspace ? roleName[workspace.role] : "Not set"],
    ["City", "Atlanta"],
  ];
  return (
    <dl data-testid="onboarding-workspace-summary" className="grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-md border border-line text-small">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="border-b border-line bg-panel px-4 py-3 text-muted [&:nth-last-child(2)]:border-b-0">{k}</dt>
          <dd className="break-words border-b border-line px-4 py-3 text-ink last:border-b-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
