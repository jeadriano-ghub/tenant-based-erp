import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function RolesPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "role.view")) redirect(`${portal.base}/dashboard`);
  const isAdminPortal = portal.isAdminPortal;

  const roles = await prisma.role.findMany({
    where: isAdminPortal
      // Platform admin sees every role (the global system roles).
      ? { OR: [{ tenantId: session.tenantId }, { name: "Tenant Admin", tenantId: null, isSystem: true }] }
      // Tenants see only their own workspace roles. Global/system roles
      // (tenantId NULL) are shared across tenants and hidden here.
      : { tenantId: session.tenantId },
    orderBy: { name: "asc" },
    include: { permissions: true, _count: { select: { users: true } } },
  });

  const canCreate = can(keys, "role.create");

  return (
    <div>
      <PageHeader
        title="Roles"
        description={
          isAdminPortal
            ? "Platform roles. The permission catalogue is managed under Permissions."
            : "Combine permissions into roles for your workspace."
        }
        action={canCreate ? <LinkButton href={`${portal.base}/dashboard/roles/new`}>New role</LinkButton> : undefined}
      />

      <Card>
        {roles.length === 0 ? (
          <EmptyState
            title="No roles yet"
            description="Roles bundle permissions so you can assign them to users."
            action={canCreate ? <LinkButton href={`${portal.base}/dashboard/roles/new`}>New role</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={roles}
            href={(r) => `${portal.base}/dashboard/roles/${r.id}`}
            primary={(r) => r.name}
            secondary={(r) => r.description ?? "—"}
            meta={(r) => [
              { label: "Permissions", value: r.permissions.length },
              { label: "Users", value: r._count.users },
            ]}
            columns={[
              {
                key: "name",
                header: "Role",
                cell: (r) => (
                  <span className="flex items-center gap-2">
                    {r.name}
                    {r.isSystem && <Badge>SYSTEM</Badge>}
                  </span>
                ),
              },
              { key: "desc", header: "Description", hideBelow: "lg", cell: (r) => <span className="text-[var(--muted)]">{r.description ?? "—"}</span> },
              { key: "perms", header: "Permissions", cell: (r) => r.permissions.length },
              { key: "users", header: "Users", cell: (r) => r._count.users },
            ]}
            actions={(r) => <LinkButton href={`${portal.base}/dashboard/roles/${r.id}`} variant="secondary" size="sm">View</LinkButton>}
          />
        )}
      </Card>
    </div>
  );
}
