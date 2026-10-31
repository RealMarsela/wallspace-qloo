/* eslint-disable @next/next/no-img-element -- small official SVG logos; next/image adds nothing for SVG */
import type { CSSProperties } from "react";

const brands = [
  { slug: "qloo", name: "Qloo", role: "Taste by place", href: "https://www.qloo.com" },
  { slug: "nvidia", name: "NVIDIA", role: "Nemotron models, NeMo Guardrails", href: "https://www.nvidia.com" },
  { slug: "nebius", name: "Nebius", role: "Token Factory, Serverless Jobs", href: "https://nebius.com" },
  { slug: "cloudflare", name: "Cloudflare", role: "Workers, D1, Durable Objects", href: "https://www.cloudflare.com" },
  { slug: "tavily", name: "Tavily", role: "Local events search", href: "https://www.tavily.com" },
];

/** "Built on" strip on panel with dot gutters: official logos, one-colour at rest (theme ink) and in brand colour on
 *  hover in light mode, each with its role. */
export function BuiltOn() {
  return (
    <section aria-labelledby="built-h" data-testid="landing-built-on" className="relative mt-10 bg-panel py-10 sm:mt-14">
      <div aria-hidden className="ws-dots absolute inset-y-0 left-0 hidden w-[max(0px,calc((100%-var(--content))/2-24px))] [--dot:var(--line)] lg:block" />
      <div aria-hidden className="ws-dots absolute inset-y-0 right-0 hidden w-[max(0px,calc((100%-var(--content))/2-24px))] [--dot:var(--line)] lg:block" />
      <div className="wrap relative">
        <h2 id="built-h" className="text-center text-small text-muted">
          Built on
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((b) => (
            <li key={b.slug} className="last:col-span-2 last:sm:col-span-1">
              <a href={b.href} target="_blank" rel="noreferrer" className="group flex flex-col items-center gap-2.5 rounded-md p-2 text-center">
                <span className="ws-logo h-8 w-[136px]" style={{ "--logo": `url(/logos/${b.slug}-mono.svg)` } as CSSProperties}>
                  <span aria-hidden className="ws-logo-mono" />
                  <img src={`/logos/${b.slug}.svg`} alt={b.name} className="size-full object-contain" />
                </span>
                <span className="text-micro text-muted transition-colors group-hover:text-ink">{b.role}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
