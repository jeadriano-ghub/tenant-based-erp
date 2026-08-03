import { prisma } from "@/lib/db";
import { requireSession, getHostContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");
  const { isAdminPortal } = await getHostContext();

  const stats = isAdminPortal
    ? [
        { label: "Tenants", value: await prisma.tenant.count() },
        { label: "Active tenants", value: await prisma.tenant.count({ where: { status: "ACTIVE" } }) },
        { label: "Platform admins", value: await prisma.user.count({ where: { tenantId: null } }) },
        { label: "Permissions", value: await prisma.permission.count() },
      ]
    : [
        { label: "Users", value: await prisma.user.count({ where: { tenantId: session.tenantId } }) },
        { label: "Roles", value: await prisma.role.count({ where: { tenantId: session.tenantId } }) },
        { label: "Branches / Warehouses", value: await prisma.location.count({ where: { tenantId: session.tenantId ?? undefined } }) },
      ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        {isAdminPortal ? "Platform Overview" : "Workspace Overview"}
      </h1>
      <p className="mb-6 text-sm text-slate-500">Welcome back, {session.name}.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
