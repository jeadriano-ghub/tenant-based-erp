import { redirect, notFound } from "next/navigation";
import { getSession, resolvePortal } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();

  const session = await getSession();
  if (session) {
    const belongs = portal.isAdminPortal
      ? session.tenantId === null
      : session.tenantId === portal.tenant.id;
    if (belongs) redirect(`${portal.base}/dashboard`);
  }

  const title = portal.isAdminPortal ? "Platform Administration" : portal.tenant.name;
  const subtitle = `${ROOT_DOMAIN}/${portal.slug}`;
  const logoUrl = portal.isAdminPortal ? null : portal.tenant.logoUrl;
  const inactive = !portal.isAdminPortal && portal.tenant.status !== "ACTIVE";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain" />
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
              JRA
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        </div>

        <div className="rounded-[var(--radius)] border bg-[var(--surface)] p-6 shadow-sm">
          {inactive ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
              This workspace is {portal.tenant.status.toLowerCase()}. Contact your platform administrator.
            </p>
          ) : (
            <LoginForm portal={portal.slug} label={portal.isAdminPortal ? "Admin" : portal.tenant.name} />
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
          {portal.isAdminPortal
            ? "Platform administrators only. Tenant users sign in at their own workspace URL."
            : "Tenant workspace sign-in. Platform administrators cannot sign in here."}
        </p>
      </div>
    </main>
  );
}
