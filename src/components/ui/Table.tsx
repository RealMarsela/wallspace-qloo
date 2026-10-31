import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Data table in the hero-window style: surface body, panel header, hairline rows, tabular numbers.
 *  Wrap in TableFrame for the rounded border and horizontal scroll on narrow screens. */
export function TableFrame({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div role={label ? "region" : undefined} aria-label={label} tabIndex={label ? 0 : undefined} className={`overflow-x-auto rounded-md border border-line bg-surface ${className}`}>
      {children}
    </div>
  );
}

export function Table({ className = "", ...rest }: HTMLAttributes<HTMLTableElement>) {
  return <table className={`w-full border-collapse text-left text-small ${className}`} {...rest} />;
}

export function Th({ className = "", numeric = false, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <th scope="col" className={`whitespace-nowrap border-b border-line bg-panel px-3 py-2.5 text-micro font-normal text-muted ${numeric ? "text-right" : ""} ${className}`} {...rest} />;
}

export function Td({ className = "", numeric = false, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <td className={`border-b border-line-2 px-3 py-2.5 align-middle text-ink ${numeric ? "text-right font-mono tabular-nums" : ""} ${className}`} {...rest} />;
}

export function Tr({ className = "", ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`transition-colors last:[&>td]:border-b-0 hover:bg-paper ${className}`} {...rest} />;
}
