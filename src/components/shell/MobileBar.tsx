"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Close } from "@/components/ui/icons";
import { Menu as MenuIcon } from "@/components/ui/icons-app";
import { currentLabel } from "./nav";
import { SidebarNav } from "./SidebarNav";

/** Phone and tablet top bar: menu trigger, mark and the current page. The sidebar opens as a drawer (native dialog, so focus
 *  is trapped and Esc closes it). Its content mounts only while open, so test IDs stay unique on the page. */
export function MobileBar({ minimal }: { minimal: boolean }) {
  const path = usePathname() ?? "";
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur-md lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} data-testid="nav-drawer-open" className="-ml-1.5 grid size-9 place-items-center rounded-md text-ink hover:bg-panel">
          <MenuIcon size={20} />
        </button>
        <Link href="/app" aria-label="Wallspace home" className="rounded-md">
          <LogoMark size={20} />
        </Link>
        <p className="min-w-0 flex-1 truncate text-small text-ink-2">{minimal ? "Set up your workspace" : currentLabel(path)}</p>
      </header>
      <dialog
        ref={ref}
        data-testid="nav-drawer"
        aria-label="Navigation"
        onClose={() => setOpen(false)}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="ws-drawer m-0 h-dvh max-h-dvh w-[min(300px,86vw)] max-w-none border-0 border-r border-line bg-panel p-0 text-ink shadow-lg"
      >
        {open ? (
          <div className="relative h-full">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3.5 z-10 grid size-9 place-items-center rounded-md text-muted hover:bg-panel-2 hover:text-ink">
              <Close size={18} />
            </button>
            <SidebarNav minimal={minimal} onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
      </dialog>
    </>
  );
}
