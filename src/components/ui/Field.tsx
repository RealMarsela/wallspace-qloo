import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Check, ChevronDown } from "./icons";

/** Shared input look: surface fill, 1px line, 8px radius, cobalt focus ring. Use on raw elements via fieldClass. */
export const fieldClass =
  "block w-full rounded-md border border-line bg-surface px-3 py-2.5 text-body text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_oklab,var(--line),var(--ink)_25%)] focus:border-cobalt focus:outline-none focus:ring-[3px] focus:ring-cobalt/20 disabled:opacity-60 aria-[invalid=true]:border-guard";

/** Label above a control, with an optional hint and error under it. */
export function Field({ label, hint, error, children, htmlFor, className = "" }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-small text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-micro text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-micro text-guard">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} min-h-24 resize-y ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative block ${className}`}>
      <select className={`${fieldClass} appearance-none pr-9`} {...rest}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </span>
  );
}

/** Square checkbox with an ink check; the label is the click target. */
export function Checkbox({ label, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`inline-flex cursor-pointer items-start gap-2.5 text-small text-ink ${className}`}>
      <span className="relative mt-0.5 inline-grid size-[18px] shrink-0 place-items-center">
        <input
          type="checkbox"
          className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-xs border border-line bg-surface transition-colors checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
          {...rest}
        />
        <Check size={14} strokeWidth={2.4} className="pointer-events-none relative text-paper opacity-0 peer-checked:opacity-100" />
      </span>
      <span>{label}</span>
    </label>
  );
}
