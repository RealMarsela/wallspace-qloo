import type { ReactNode } from "react";
import { Plus } from "./icons";

export interface AccordionItem {
  id: string;
  q: ReactNode;
  a: ReactNode;
}

/** FAQ accordion on native <details>: panel rows, plus icon turns into an x when open. Keyboard and no-JS friendly. */
export function Accordion({ items, className = "", testId }: { items: AccordionItem[]; className?: string; testId?: string }) {
  return (
    <div data-testid={testId} className={`flex flex-col gap-2 ${className}`}>
      {items.map((it) => (
        <details key={it.id} data-testid={testId ? `${testId}-${it.id}` : undefined} className="group/acc rounded-md bg-panel transition-colors open:bg-panel-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3.5 text-body text-ink marker:hidden [&::-webkit-details-marker]:hidden">
            <span>{it.q}</span>
            <Plus size={18} className="shrink-0 text-ink-2 transition-transform duration-300 ease-out group-open/acc:rotate-45" />
          </summary>
          <div className="px-4 pb-4 text-small leading-relaxed text-muted">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
