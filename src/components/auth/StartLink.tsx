"use client";

import Link from "next/link";
import { useMe } from "@/lib/use-me";

/** The one "Start free / Open Wallspace" link. Reads the shared /api/me: signed out -> /signin; signed in -> /app; no workspace -> onboarding. */
export function StartLink({ testId, className, signedOutLabel = "Start free" }: { testId: string; className?: string; signedOutLabel?: string }) {
  const state = useMe();
  const me = state.status === "ready" ? state.me : null;
  const [href, label, mark] = !me?.user
    ? ["/signin", signedOutLabel, "signed-out"]
    : me.workspace
      ? ["/app", "Open Wallspace", "signed-in"]
      : ["/app/onboarding", "Finish setup", "no-workspace"];
  return (
    <Link data-testid={testId} data-state={mark} href={href} className={className ?? "underline"}>
      {label}
    </Link>
  );
}
