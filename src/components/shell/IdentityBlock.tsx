"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StartLink } from "@/components/auth/StartLink";
import { buttonClass } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Skeleton } from "@/components/ui/States";
import { Tooltip } from "@/components/ui/Tooltip";
import { Info, Lock } from "@/components/ui/icons";
import { ChevronUpDown, Globe, Help, LogOut } from "@/components/ui/icons-app";
import { notifyAuthChanged, sendJson } from "@/lib/auth-client";
import { useMe } from "@/lib/use-me";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "W";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full border border-[#22211d]/15 bg-park font-mono text-[0.72rem] font-medium text-[#22211d]">
      {initials(name)}
    </span>
  );
}

/** The one identity block, bottom left of the sidebar: who is signed in and in which workspace, with a menu for the website,
 *  limits, help and sign-out (the existing sign-out call). Signed out (public /sample), it offers sign-in instead. */
export function IdentityBlock() {
  const router = useRouter();
  const state = useMe();
  const [busy, setBusy] = useState(false);
  const me = state.status === "ready" ? state.me : null;
  const signedIn = Boolean(me?.user);
  const mark = state.status === "loading" ? "loading" : signedIn ? "signed-in" : "signed-out";

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

  if (state.status === "loading")
    return (
      <div data-testid="auth-indicator" data-state={mark} className="flex items-center gap-2.5 p-2" aria-busy="true">
        <Skeleton className="size-8 !rounded-full" />
        <span className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </span>
      </div>
    );

  if (!signedIn || !me?.user)
    return (
      <div data-testid="auth-indicator" data-state={mark} className="flex flex-col gap-2.5 rounded-md border border-line bg-surface p-3">
        <p className="flex items-start gap-2 text-micro text-muted">
          <Lock size={14} className="mt-px shrink-0" />
          You are viewing the public sample plan. Sign in to write your own brief.
        </p>
        <div className="flex gap-2">
          <Link href="/signin" data-testid="auth-sign-in-link" className={buttonClass("ghost", "sm", "flex-1")}>
            Sign in
          </Link>
          <StartLink testId="auth-start-link" signedOutLabel="Start free" className={buttonClass("primary", "sm", "flex-1")} />
        </div>
      </div>
    );

  const user = me.user;
  const ws = me.workspace;
  const role = ws?.role === "media-owner" ? "Media owner" : "Buyer";
  return (
    <div data-testid="auth-indicator" data-state={mark} className="flex items-center gap-1">
      <Menu
        label="Account"
        testId="identity-menu"
        placement="top-start"
        className="w-[260px]"
        triggerClassName="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-panel-2 aria-expanded:bg-panel-2"
        trigger={
          <>
            <Avatar name={user.name} />
            <span data-testid="auth-user" className="min-w-0 flex-1">
              <span className="block truncate text-small text-ink">{user.name}</span>
              <span className="block truncate text-micro text-muted">{ws?.name ?? "No workspace yet"}</span>
            </span>
            <ChevronUpDown size={16} className="shrink-0 text-muted" />
          </>
        }
        header={
          <div className="mb-1 flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5 pt-1.5">
            <Avatar name={ws?.name ?? user.name} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-small">{ws?.name ?? "No workspace yet"}</span>
              <span className="block truncate text-micro text-muted">
                {role} · Atlanta · {user.email}
              </span>
            </span>
          </div>
        }
        items={[
          { id: "site", label: "Website", hint: "wallspace.pages.dev", icon: <Globe size={16} />, href: "/", testId: "identity-menu-site" },
          { id: "help", label: "Help", icon: <Help size={16} />, href: "/app/help", testId: "identity-menu-help" },
          { id: "limits", label: "Limits and data", hint: "What is real, what is sample", icon: <Info size={16} />, href: "/limits", testId: "nav-limits" },
          { id: "sep", separator: true },
          { id: "out", label: busy ? "Signing out…" : "Sign out", icon: <LogOut size={16} />, onSelect: () => void signOut(), danger: true, disabled: busy, testId: "identity-menu-sign-out" },
        ]}
      />
      <Tooltip tip="Sign out" side="top">
        <button
          type="button"
          data-testid="auth-sign-out"
          disabled={busy}
          onClick={() => void signOut()}
          aria-label="Sign out"
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-ink disabled:opacity-50"
        >
          <LogOut size={18} />
        </button>
      </Tooltip>
    </div>
  );
}
