import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, resolvePortal } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { AppShell } from "@/components/app-shell";
import { logoutAction } from "../../(auth)/actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();

  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  const has = (k: string) => keys.includes("*") || keys.includes(k);
  const base = portal.base;

  const nav = [
    { href: `${base}/dashboard`, label: "Overview", show: true },
    { href: `${base}/dashboard/tenants`, label: "Tenant Management", show: portal.isAdminPortal && has("tenant.view") },
    // Tenant users may never see the platform permission catalogue.
    { href: `${base}/dashboard/users`, label: "Manage Users", show: has("user.view") },
    { href: `${base}/dashboard/roles`, label: "Roles", show: has("role.view") },
    { href: `${base}/dashboard/permissions`, label: "Permissions", show: portal.isAdminPortal && has("permission.view") },
    { href: `${base}/dashboard/locations`, label: "Branch / Warehouse", show: !portal.isAdminPortal && has("location.view") },
  ]
    .filter((n) => n.show)
    .map(({ href, label }) => ({ href, label }));

  const signOut = (
    <form action={logoutAction}>
      <input type="hidden" name="portal" value={portal.slug} />
      <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[var(--background)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Sign out
      </button>
    </form>
  );

  return (
    <AppShell
      nav={nav}
      title={portal.isAdminPortal ? "JRA ERP" : portal.tenant.name}
      subtitle={`${ROOT_DOMAIN}/${portal.slug}`}
      logoUrl={portal.isAdminPortal ? null : portal.tenant.logoUrl}
      defaultLogoUrl={process.env.NEXT_PUBLIC_DEFAULT_LOGO || null}
      user={{ name: session.name, email: session.email, isSuperAdmin: session.isSuperAdmin }}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
