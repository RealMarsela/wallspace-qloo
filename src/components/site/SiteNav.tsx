import Link from "next/link";
import { StartLink } from "@/components/auth/StartLink";
import { buttonClass } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ArrowRight } from "@/components/ui/icons";

const links = [
  { href: "/sample", label: "Sample plan", id: "sample" },
  { href: "/#owners", label: "Media owners", id: "owners" },
  { href: "/limits", label: "Limits", id: "limits" },
];

/** Public top bar: thin night announcement strip + paper nav (lockup, three links, the shared Start free / Open Wallspace). */
export function SiteNav() {
  return (
    <header data-testid="site-nav" className="sticky top-0 z-40">
      <a href="#main" className="sr-only rounded-md bg-signal px-3 py-2 text-small text-[#22211d] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50">
        Skip to content
      </a>
      <div className="bg-night text-on-night">
        <p className="wrap flex h-9 items-center justify-center gap-2 text-center text-micro sm:text-small">
          <span className="truncate">Free to use. Demo city Atlanta. Taste by place, never identity.</span>
          <Link href="/limits" data-testid="announce-limits" className="group hidden shrink-0 items-center gap-1 text-on-night-muted hover:text-on-night sm:inline-flex">
            What it cannot do yet <ArrowRight size={14} className="ws-arrow" />
          </Link>
        </p>
      </div>
      <nav aria-label="Site" className="border-b border-line bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
        <div className="wrap flex h-16 items-center gap-6">
          <Link href="/" data-testid="site-home" aria-label="Wallspace home" className="shrink-0 rounded-xs">
            <Logo size={24} />
          </Link>
          <ul className="mx-auto hidden items-center gap-7 text-small text-ink-2 md:flex">
            {links.map((l) => (
              <li key={l.id}>
                <Link href={l.href} data-testid={`site-nav-${l.id}`} className="transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <StartLink testId="site-nav-start" className={buttonClass("primary", "sm", "ws-after-arrow h-9 px-3.5")} />
            <details className="group/menu relative md:hidden">
              <summary aria-label="Menu" className="grid size-9 cursor-pointer list-none place-items-center rounded-md border border-line bg-surface [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="flex w-4 flex-col gap-[3px]">
                  <i className="h-[1.5px] bg-ink transition-transform group-open/menu:translate-y-[4.5px] group-open/menu:rotate-45" />
                  <i className="h-[1.5px] bg-ink transition-opacity group-open/menu:opacity-0" />
                  <i className="h-[1.5px] bg-ink transition-transform group-open/menu:-translate-y-[4.5px] group-open/menu:-rotate-45" />
                </span>
              </summary>
              <ul className="absolute right-0 top-11 w-56 rounded-md border border-line bg-surface p-1.5 shadow-lg">
                {links.map((l) => (
                  <li key={l.id}>
                    <Link href={l.href} className="block rounded-[6px] px-3 py-2.5 text-small text-ink hover:bg-panel">
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/signin" className="block rounded-[6px] px-3 py-2.5 text-small text-ink hover:bg-panel">
                    Sign in
                  </Link>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </nav>
    </header>
  );
}
