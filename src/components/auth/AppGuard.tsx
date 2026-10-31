"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { signInHref } from "@/lib/routes";
import { useMe } from "@/lib/use-me";

const ONBOARDING = "/app/onboarding";

/** Client half of the /app protection (middleware only checks that a cookie exists). One /api/me answer decides:
 *  no valid session -> /signin?next=<here>; signed in with no workspace -> onboarding; otherwise render the page. */
export function AppGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname() ?? "/app";
  const state = useMe();
  const me = state.status === "ready" ? state.me : null;
  const target = !me ? null : !me.user ? "signin" : !me.workspace && path !== ONBOARDING ? ONBOARDING : null;

  useEffect(() => {
    if (target === "signin") router.replace(signInHref(path + window.location.search));
    else if (target) router.replace(target);
  }, [target, path, router]);

  if (state.status === "error")
    return (
      <div data-testid="app-guard-error" className="p-6">
        <p>Could not check your session.</p>
        <button type="button" data-testid="app-guard-retry" onClick={state.reload} className="underline">
          Try again
        </button>
      </div>
    );
  if (!me || target)
    return (
      <div data-testid="app-guard-checking" aria-busy="true" className="p-6">
        Checking your session...
      </div>
    );
  return <>{children}</>;
}
