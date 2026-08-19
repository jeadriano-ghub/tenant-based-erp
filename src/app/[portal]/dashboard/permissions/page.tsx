import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, LinkButton } from "@/components/ui";
import { PLATFORM_ONLY_KEYS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PermissionsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!portal.isAdminPortal && !can(keys, "role.view")) redirect(`${portal.base}/dashboard`);
  if (!can(keys, "permission.view") && portal.isAdminPortal) redirect(`${portal.base}/dashboard`);

  const allPermissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
  const permissions = portal.isAdminPortal ? allPermissions : allPermissions.filter((p) => !PLATFORM_ONLY_KEYS.has(p.key));
  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const canManage = portal.isAdminPortal && can(keys, "permission.manage");

  const modules = [
    { name: "User Management", description: "Users, roles, branches." },
    { name: "Inventory", description: "Catalog, purchasing, sales, POS." },
    { name: "Roles & Permissions", description: "Roles and permission catalogue." },
    { name: "Tenant Management", description: "Tenants and subscriptions." },
  ];

  return (
    <div>
      <PageHeader
        title="Permissions"
        description={
          canManage
            ? "The platform-owned permission catalogue. Tenants combine these into roles."
            : "Combine these permissions into roles under Roles."
        }
        action={canManage ? <LinkButton href={`${portal.base}/dashboard/permissions/new`}>New permission</LinkButton> : undefined}
      />

      <div className="space-y-6">
        {modules.map((module) => {
          const items = grouped[module.name];
          if (!items || items.length === 0) return null;
          return (
            <Card key={module.name} title={module.name} description={module.description}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <code className="text-xs font-medium">{p.key}</code>
                    <p className="mt-1 text-xs text-[var(--muted)]">{p.description ?? "—"}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
