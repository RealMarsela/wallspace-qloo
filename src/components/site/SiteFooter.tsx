import Link from "next/link";
import { StartLink } from "@/components/auth/StartLink";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { CrosswalkSvg } from "@/components/motif/Crosswalk";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Em } from "@/components/ui/SectionHeading";

const NIGHT = "#22211d";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/sample", label: "Sample plan", id: "sample" },
      { href: "/sample/run", label: "Run log", id: "run" },
      { href: "/app/owner", label: "Media owners", id: "owner" },
      { href: "/app/connections", label: "Connections", id: "connections" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/limits", label: "Limits", id: "limits" },
      { href: "/privacy", label: "Privacy", id: "privacy" },
      { href: "/terms", label: "Terms", id: "terms" },
      { href: "/signin", label: "Sign in", id: "signin" },
    ],
  },
];

/** Night CTA and footer for public pages: heading left, two actions, streets sweeping in from the right and running
 *  along the footer edge. `cta={false}` keeps only the footer (legal pages). */
export function SiteFooter({ cta = true }: { cta?: boolean }) {
  return (
    <footer data-testid="footer" className="relative overflow-hidden bg-night text-on-night">
      {cta ? (
        <div className="relative">
          <StreetCanvas viewBox="0 0 1440 420" fit="slice" align="xMaxYMax" className="absolute inset-0 hidden md:block">
            <Street points={[[-40, 392], [880, 392], [1000, 272], [1000, 150], [1100, 50], [1480, 50]]} lanes={[{ ink: "lilac" }, { ink: "signal", line: "dot", lineInk: "night" }, { ink: "cobalt" }]} edge={NIGHT} radius={90} />
            <Street points={[[1250, -20], [1250, 260], [1480, 260]]} lanes={[{ ink: "park", line: "double" }, { ink: "poster", line: "dot" }]} edge={NIGHT} radius={80} delay={300} />
            <CrosswalkSvg x={1250} y={52} size={64} fill="#ffd12e" stripe="#22211d" delay={900} />
          </StreetCanvas>
          <StreetCanvas viewBox="0 0 400 120" fit="slice" align="xMinYMax" className="absolute inset-x-0 bottom-0 h-[120px] md:hidden">
            <Street points={[[-20, 92], [280, 92], [340, 32], [420, 32]]} lanes={[{ ink: "lilac" }, { ink: "signal", line: "dot", lineInk: "night" }, { ink: "cobalt" }]} width={14} edge={NIGHT} radius={50} />
          </StreetCanvas>
          <div className="wrap relative pb-40 pt-20 sm:pb-44 sm:pt-28">
            <h2 className="max-w-[16ch] text-h2">
              Plan the next flight by <Em>taste</Em>, not by traffic counts.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/sample" variant="light" arrow testId="cta-sample">
                Open the sample plan
              </LinkButton>
              <StartLink testId="cta-start" className={buttonClass("secondary", "md", "ws-after-arrow")} />
            </div>
          </div>
        </div>
      ) : null}
      <div className={`wrap relative grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] ${cta ? "border-t border-night-line" : ""}`}>
        <div className="flex flex-col gap-4">
          <Link href="/" aria-label="Wallspace home" className="w-fit rounded-xs">
            <Logo tone="night" size={24} />
          </Link>
          <p className="max-w-[30ch] text-small text-on-night-muted">Out-of-home planning by taste by place. Never by identity. Atlanta sample.</p>
          <p className="max-w-[44ch] text-micro text-on-night-muted/80">
            Billboard positions ©{" "}
            <a className="underline hover:text-on-night" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>{" "}
            (ODbL). Porchlight Comedy Tour is a sample brand; face sizes and rates are sample values.
          </p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="eyebrow !text-on-night-muted">{c.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-small">
              {c.links.map((l) => (
                <li key={l.id}>
                  <Link href={l.href} data-testid={`footer-${l.id}`} className="text-on-night/90 transition-colors hover:text-on-night">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
