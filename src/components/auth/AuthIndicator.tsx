"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyAuthChanged, sendJson } from "@/lib/auth-client";
import { useMe } from "@/lib/use-me";
import { StartLink } from "./StartLink";

/** Plain signed-in indicator for the shared layout: who is signed in and a sign-out control. Designed later. */
export function AuthIndicator() {
  const router = useRouter();
  const state = useMe();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await sendJson("POST", "/api/auth/sign-out", {});
    } finally {
      setBusy(false);
      notifyAuthChanged();
      router.push("/");
    }
  }

  const me = state.status === "ready" ? state.me : null;
  const signedIn = Boolean(me?.user);
  const mark = state.status === "loading" ? "loading" : signedIn ? "signed-in" : "signed-out";
  return (
    <div data-testid="auth-indicator" data-state={mark} className="flex items-center justify-end gap-3 border-b border-rule bg-ground-2 px-4 py-1 text-[0.8rem] text-ink-2">
      {state.status === "loading" ? null : signedIn && me ? (
        <>
          <span data-testid="auth-user">
            {me.user?.name} · {me.workspace?.name ?? "no workspace yet"}
          </span>
          <StartLink testId="auth-open-app" />
          <button type="button" data-testid="auth-sign-out" disabled={busy} onClick={() => void signOut()} className="underline">
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link data-testid="auth-sign-in-link" href="/signin" className="underline">
            Sign in
          </Link>
          <StartLink testId="auth-start-link" />
        </>
      )}
    </div>
  );
}
