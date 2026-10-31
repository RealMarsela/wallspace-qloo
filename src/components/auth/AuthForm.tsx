"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { notifyAuthChanged, safeNext, sendJson } from "@/lib/auth-client";
import { useMe } from "@/lib/use-me";

const field = "block w-full rounded border border-rule bg-panel px-3 py-2";
type Mode = "sign-up" | "sign-in";

/** Plain email + password form for /signin: sign-in and sign-up on one page with a mode switch. Google shows only when the server has its keys.
 *  A visitor with a valid session skips the form and goes to ?next= (only paths under /app), else /app. */
export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const failed = params.get("error") !== null;
  const [mode, setMode] = useState<Mode>(params.get("mode") === "sign-up" ? "sign-up" : "sign-in");
  const state = useMe();
  const me = state.status === "ready" ? state.me : null;
  const [error, setError] = useState<string | null>(failed ? "Google sign-in did not complete. Try again, or use your email and password." : null);
  const [busy, setBusy] = useState(false);
  const up = mode === "sign-up";
  const signedIn = Boolean(me?.user);

  useEffect(() => {
    if (signedIn) router.replace(next);
  }, [signedIn, next, router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await sendJson("POST", up ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email", {
        ...(up ? { name: String(f.get("name") ?? "") } : {}),
        email: String(f.get("email") ?? ""),
        password: String(f.get("password") ?? ""),
      });
      notifyAuthChanged();
      router.push(up ? "/app/onboarding" : next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    setError(null);
    try {
      const out = (await sendJson("POST", "/api/auth/sign-in/social", { provider: "google", callbackURL: next })) as { url?: string };
      if (out.url) window.location.assign(out.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in is unavailable.");
    }
  }

  if (signedIn)
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10" data-testid="signin-redirecting">
        You are signed in. Opening Wallspace...
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10" data-testid="signin-page" data-mode={mode}>
      <h1 data-testid={`${mode}-title`} className="mb-4 text-xl font-bold">
        {up ? "Create your account" : "Sign in"}
      </h1>
      <form key={mode} onSubmit={(e) => void submit(e)} className="space-y-3" data-testid={`${mode}-form`}>
        {up ? (
          <label className="block">
            Name
            <input data-testid="signup-name" name="name" autoComplete="name" required maxLength={80} className={field} />
          </label>
        ) : null}
        <label className="block">
          Email
          <input data-testid={up ? "signup-email" : "signin-email"} name="email" type="email" autoComplete="email" required className={field} />
        </label>
        <label className="block">
          Password{up ? " (10 characters or more)" : ""}
          <input data-testid={up ? "signup-password" : "signin-password"} name="password" type="password" autoComplete={up ? "new-password" : "current-password"} required minLength={up ? 10 : 1} maxLength={128} className={field} />
        </label>
        <button type="submit" data-testid={up ? "signup-submit" : "signin-submit"} disabled={busy} className="rounded border border-rule bg-ink px-4 py-2 text-ground">
          {busy ? "Working..." : up ? "Create account" : "Sign in"}
        </button>
      </form>
      {me?.providers.google ? (
        <button type="button" data-testid={`${mode}-google`} onClick={() => void withGoogle()} className="mt-3 rounded border border-rule bg-panel px-4 py-2">
          Continue with Google
        </button>
      ) : null}
      {error ? (
        <p role="alert" data-testid={`${mode}-error`} className="mt-3 text-guard">
          {error}
        </p>
      ) : null}
      <p className="mt-6 text-ink-2">
        {up ? "Already have an account? " : "New here? "}
        <button type="button" data-testid="signin-mode-switch" onClick={() => { setMode(up ? "sign-in" : "sign-up"); setError(null); }} className="underline">
          {up ? "Sign in" : "Create an account"}
        </button>
      </p>
    </main>
  );
}
