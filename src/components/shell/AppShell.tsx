"use client";
import "./shell.css";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { MobileBar } from "./MobileBar";
import { SidebarNav } from "./SidebarNav";

/** The product frame (application-sidebar pattern): a sticky panel rail on the left with a narrow street along its edge,
 *  and a paper content column at least one viewport tall. Phones get a top bar and the rail as a drawer.
 *  Used by /app (behind the guard) and by the public /sample subtree. No marketing bar, no disclaimer footer. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "";
  const minimal = path.startsWith("/app/onboarding");
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <div className="relative z-30 hidden border-r border-line bg-panel lg:block">
          <aside aria-label="Sidebar" className="sticky top-0 h-dvh">
            <SidebarNav minimal={minimal} />
          </aside>
          <i aria-hidden className="ws-edge-street pointer-events-none absolute -right-[4px] top-0 h-full w-[7px]" />
        </div>
        <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
          <MobileBar minimal={minimal} />
          <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
