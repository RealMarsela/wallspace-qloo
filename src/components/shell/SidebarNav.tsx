"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { Billboard, Lock, Plug } from "@/components/ui/icons";
import { Brief, Compare, Dashboard, Help, Layers, Route } from "@/components/ui/icons-app";
import { useMe } from "@/lib/use-me";
import { IdentityBlock } from "./IdentityBlock";
import { navGroups, type NavIcon } from "./nav";

const icons: Record<NavIcon, ReactNode> = {
  dashboard: <Dashboard size={18} />,
  brief: <Brief size={18} />,
  sample: <Billboard size={18} />,
  compare: <Compare size={18} />,
  inventory: <Layers size={18} />,
  connections: <Plug size={18} />,
  how: <Route size={18} />,
  help: <Help size={18} />,
};

/** Sidebar body shared by the desktop rail and the phone drawer: lockup, grouped nav, identity block at the bottom.
 *  `minimal` (onboarding) hides the nav: there is nowhere to go until the workspace exists. */
export function SidebarNav({ minimal = false, onNavigate }: { minimal?: boolean; onNavigate?: () => void }) {
  const path = usePathname() ?? "";
  const me = useMe();
  const signedOut = me.status === "ready" && !me.me.user;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href={signedOut ? "/" : "/app"} data-testid="nav-home" onClick={onNavigate} aria-label="Wallspace home" className="rounded-md">
          <Logo size={22} />
        </Link>
      </div>
      <nav aria-label="Product" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {minimal ? (
          <p className="px-2 pt-2 text-micro text-muted">Set up your workspace to open the planner.</p>
        ) : (
          navGroups.map((g) => (
            <div key={g.id} className="pt-4 first:pt-1">
              <p className="eyebrow px-2 pb-1.5">{g.label}</p>
              <ul className="flex flex-col gap-0.5">
                {g.items.map((n) => {
                  const active = n.match(path);
                  const href = signedOut && n.publicHref ? n.publicHref : n.href;
                  const locked = signedOut && href.startsWith("/app");
                  return (
                    <li key={n.id}>
                      <Link
                        href={href}
                        data-testid={`nav-${n.id}`}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={`group/nav flex h-9 items-center gap-2.5 rounded-md px-2 text-small transition-colors ${
                          active ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
                        }`}
                      >
                        <span className={active ? "text-ink" : "text-muted group-hover/nav:text-ink-2"}>{icons[n.icon]}</span>
                        <span className="flex-1 truncate">{n.label}</span>
                        {locked ? <Lock size={14} className="text-muted" aria-label="Sign in to open" /> : null}
                        {active ? <i aria-hidden className="h-4 w-1 rounded-full bg-park" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
      <div className="shrink-0 border-t border-line p-2.5">
        <IdentityBlock />
      </div>
    </div>
  );
}
