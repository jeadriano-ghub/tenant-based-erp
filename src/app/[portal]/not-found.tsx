import Link from "next/link";

/**
 * Portal-scoped 404 for a tenant that does not exist (or an unknown sub-route).
 * Blocked-tenant cases (inactive / expired) are handled by the portal layout
 * with an explanation, so this screen is the generic "does not exist" case.
 */
export default function PortalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border bg-[var(--surface)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[var(--muted)]" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--brand)]">404</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Workspace not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          This workspace does not exist. Check the address, or contact your platform administrator if you believe this is a mistake.
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
