import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession, getPermissionKeys, getHostContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "../(auth)/actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireSession();
  if (!session) redirect("/login");

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  const { isAdminPortal } = await getHostContext();
  const has = (k: string) => keys.includes("*") || keys.includes(k);

  const tenant = session.tenantId
    ? await prisma.tenant.findUnique({ where: { id: session.tenantId } })
    : null;

  const nav = [
    { href: "/dashboard", label: "Overview", show: true },
    { href: "/dashboard/tenants", label: "Tenant Management", show: isAdminPortal && has("tenant.view") },
    { href: "/dashboard/users", label: "Manage Users", show: has("user.view") },
    { href: "/dashboard/roles", label: "Roles", show: has("role.view") },
    { href: "/dashboard/permissions", label: "Permissions", show: has("permission.view") },
    { href: "/dashboard/locations", label: "Branch / Warehouse", show: !isAdminPortal && has("location.view") },
  ].filter((n) => n.show);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-bold text-slate-900">
            {isAdminPortal ? "JRA ERP · Admin" : tenant?.name ?? "Workspace"}
          </div>
          <div className="text-[11px] text-slate-500">
            {isAdminPortal ? "Platform console" : `${tenant?.subdomain}.erp.jra.com`}
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => (
            <Link
              key={n.href} href={n.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-2">
            <div className="truncate text-sm font-medium text-slate-900">{session.name}</div>
            <div className="truncate text-[11px] text-slate-500">{session.email}</div>
            {session.isSuperAdmin && (
              <span className="mt-1 inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                SUPER ADMIN
              </span>
            )}
          </div>
          <form action={logoutAction}>
            <button className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
