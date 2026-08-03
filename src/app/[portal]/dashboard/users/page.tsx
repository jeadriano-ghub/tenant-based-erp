import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState, statusTone } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function UsersPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "user.view")) redirect(`${portal.base}/dashboard`);
  const isAdminPortal = portal.isAdminPortal;

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      roles: { include: { role: true } },
      locations: { include: { location: true } },
    },
  });

  const canCreate = can(keys, "user.create");

  return (
    <div>
      <PageHeader
        title="Manage Users"
        description={
          isAdminPortal
            ? "Platform administrators (tenant_id is NULL) sign in only at the admin portal."
            : "Workspace users, their roles and assigned locations."
        }
        action={canCreate ? <LinkButton href={`${portal.base}/dashboard/users/new`}>New user</LinkButton> : undefined}
      />

      <Card>
        {users.length === 0 ? (
          <EmptyState
            title="No users yet"
            action={canCreate ? <LinkButton href={`${portal.base}/dashboard/users/new`}>New user</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={users}
            href={(u) => `${portal.base}/dashboard/users/${u.id}`}
            primary={(u) => `${u.firstName} ${u.lastName}`}
            secondary={(u) => u.email}
            meta={(u) => [
              { label: "Status", value: <Badge tone={statusTone(u.status)}>{u.status}</Badge> },
              { label: "Roles", value: u.roles.map((r) => r.role.name).join(", ") || "—" },
            ]}
            columns={[
              {
                key: "name",
                header: "Name",
                cell: (u) => (
                  <span className="flex items-center gap-2">
                    {u.firstName} {u.lastName}
                    {u.isSuperAdmin && <Badge tone="brand">SUPER</Badge>}
                  </span>
                ),
              },
              { key: "email", header: "Email", cell: (u) => <span className="text-[var(--muted)]">{u.email}</span> },
              { key: "roles", header: "Roles", hideBelow: "lg", cell: (u) => u.roles.map((r) => r.role.name).join(", ") || "—" },
              { key: "loc", header: "Location", hideBelow: "xl", cell: (u) => u.locations.map((l) => l.location.code).join(", ") || "—" },
              { key: "status", header: "Status", cell: (u) => <Badge tone={statusTone(u.status)}>{u.status}</Badge> },
            ]}
            actions={(u) => <LinkButton href={`${portal.base}/dashboard/users/${u.id}`} variant="secondary" size="sm">View</LinkButton>}
          />
        )}
      </Card>
    </div>
  );
}
