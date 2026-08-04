"use client";

import Link from "next/link";

/**
 * Root error boundary for unexpected runtime errors (not the blocked-tenant
 * case, which is handled via notFound() + the portal not-found screen).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md text-center" data-error-digest={error.digest}>
        <p className="text-sm font-semibold text-[var(--brand)]">Something went wrong</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Unexpected error</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          An unexpected error occurred. Please try again, or contact your platform administrator.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Go to admin sign-in
        </Link>
      </div>
    </main>
  );
}
