"use client";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  title: string;
}

/** Sticky "On this page" list built from the page's section headings; highlights the section in view. */
export function PageToc() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("main section[id][aria-labelledby]")];
    const found = sections.map((s) => ({ id: s.id, title: s.querySelector("h2")?.textContent ?? s.id }));
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const t = setTimeout(() => setItems(found), 0);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, []);
  return (
    <nav aria-label="On this page" className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
      <p className="eyebrow">On this page</p>
      <ul className="mt-4 flex flex-col gap-0.5 border-l border-line text-small">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className={`-ml-px block border-l py-1.5 pl-4 transition-colors ${active === it.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {it.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
