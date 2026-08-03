"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "../../(auth)/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
    >
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? "Signing in…" : `Sign in to ${label}`}
    </button>
  );
}

export function LoginForm({ portal, label }: { portal: string; label: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="portal" value={portal} />
      {state?.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
        <input
          id="email" name="email" type="email" required autoComplete="email" autoFocus
          placeholder="you@company.com"
          className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
        <input
          id="password" name="password" type="password" required autoComplete="current-password"
          placeholder="••••••••••"
          className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
        />
      </div>

      <SubmitButton label={label} />
    </form>
  );
}
