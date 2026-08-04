import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePortal } from "@/lib/auth";

function BlockedScreen({ reason, name }: { reason: "inactive" | "expired"; name: string }) {
  const title =
    reason === "inactive" ? `${name} is unavailable` : `${name} contract expired`;
  const body =
    reason === "inactive"
      ? "This workspace is inactive. Contact your system administrator or the platform owner to have it reactivated."
      : "Your contract has expired. Contact the platform administrator to renew your contract and regain access.";
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
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
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

/**
 * Validates the first URL segment for every route beneath it.
 * "admin" is the platform portal; anything else must match a tenant in the
 * database, otherwise we render the 404 page.
 *
 * A blocked tenant (inactive or expired contract) gets a 404-styled "workspace
 * unavailable" screen — covering the login page and every tenant route.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();

  if (!portal.isAdminPortal && portal.tenant.blocked && portal.tenant.blockReason) {
    return <BlockedScreen reason={portal.tenant.blockReason} name={portal.tenant.name} />;
  }

  return <>{children}</>;
}
