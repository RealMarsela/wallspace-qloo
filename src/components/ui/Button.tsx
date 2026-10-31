import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "./icons";

/** primary: ink on paper. light: white on a night band. secondary: night-2 on a night band. ghost: outlined on paper.
 *  quiet: text-only. heat / picked: legacy fills kept for existing pages. */
export type Variant = "primary" | "light" | "secondary" | "ghost" | "quiet" | "heat" | "picked";

const base =
  "group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-body font-normal leading-none transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 shadow-sm",
  light: "bg-white text-[#22211d] hover:bg-[#efeeea]",
  secondary: "border border-night-line bg-night-2 text-on-night hover:bg-[#3a3833]",
  ghost: "border border-line bg-surface text-ink hover:border-ink",
  quiet: "text-ink-2 hover:bg-panel hover:text-ink",
  heat: "bg-poster text-[#22211d] hover:brightness-105",
  picked: "bg-picked text-white hover:brightness-110",
};

const sizes = { sm: "h-8 px-3 text-small", md: "h-10 px-4 text-body", lg: "h-12 px-5 text-[1.0625rem]" };

export type Size = keyof typeof sizes;

export function buttonClass(variant: Variant = "ghost", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

function Inner({ children, arrow }: { children: ReactNode; arrow?: boolean }) {
  return (
    <>
      {children}
      {arrow ? <ArrowRight size={16} className="ws-arrow -mr-0.5" /> : null}
    </>
  );
}

export function Button({
  variant = "ghost",
  size = "md",
  arrow = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; arrow?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </button>
  );
}

export function LinkButton({
  href,
  variant = "ghost",
  size = "md",
  arrow = false,
  className = "",
  children,
  testId,
  external = false,
}: {
  testId?: string;
  href: string;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const cls = buttonClass(variant, size, className);
  if (external)
    return (
      <a href={href} data-testid={testId} className={cls} target="_blank" rel="noreferrer">
        <Inner arrow={arrow}>{children}</Inner>
      </a>
    );
  return (
    <Link href={href} data-testid={testId} className={cls}>
      <Inner arrow={arrow}>{children}</Inner>
    </Link>
  );
}

/** Inline text link with the arrow nudge ("Open the sample plan ->"). */
export function TextLink({ href, children, testId, className = "" }: { href: string; children: ReactNode; testId?: string; className?: string }) {
  return (
    <Link href={href} data-testid={testId} className={`group inline-flex items-center gap-1.5 text-small text-ink underline-offset-4 hover:underline ${className}`}>
      {children}
      <ArrowRight size={15} className="ws-arrow" />
    </Link>
  );
}
