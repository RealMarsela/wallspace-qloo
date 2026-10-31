import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { SampleProvider } from "@/components/landing/data";
import { AuthVisual } from "@/components/site/AuthVisual";
import { Logo } from "@/components/ui/Logo";
import { ArrowLeft } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Wallspace or create a free account to plan out-of-home by taste.",
};

/** Full-screen split: the form on the left (logo, back to site, the shared AuthForm, terms line), the street composition
 *  on the right. Auth behaviour lives in AuthForm; this page only frames and styles it. */
export default function SignInPage() {
  return (
    <div className="ws-auth grid flex-1 bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Wallspace home" className="rounded-xs">
            <Logo size={24} />
          </Link>
          <Link href="/" data-testid="signin-back" className="group inline-flex items-center gap-1.5 text-small text-muted hover:text-ink">
            <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" /> Back to site
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-center py-12">
          <Suspense fallback={<main className="mx-auto w-full max-w-[400px]" data-testid="signin-loading"><span className="skeleton block h-80" /></main>}>
            <AuthForm />
          </Suspense>
        </div>
        <p className="mx-auto w-full max-w-[400px] text-micro text-muted">
          By continuing you agree to the{" "}
          <Link href="/terms" className="text-ink underline underline-offset-4">Terms</Link> and the{" "}
          <Link href="/privacy" className="text-ink underline underline-offset-4">Privacy policy</Link>. Wallspace is free; there is
          nothing to pay for.
        </p>
      </div>
      <div className="hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100dvh-24px)]">
          <SampleProvider>
            <AuthVisual />
          </SampleProvider>
        </div>
      </div>
    </div>
  );
}
