import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveUserAction } from "../../../actions";
import { UserForm } from "../../user-form";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "user.update")) redirect(`${portal.base}/dashboard/users/${id}`);
  const isAdminPortal = portal.isAdminPortal;

  const u = await prisma.user.findUnique({
    where: { id },
    include: { roles: true, locations: true },
  });
  if (!u || u.tenantId !== session.tenantId) notFound();

  // Tenant-owned roles plus the shared global "Tenant Admin" role, which a
  // tenant can assign to its own users (role is tenantId NULL by design).
  const roles = await prisma.role.findMany({
    where: { OR: [{ tenantId: session.tenantId }, { name: "Tenant Admin", tenantId: null, isSystem: true }] },
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: true } } },
  });
  const locations = session.tenantId
    ? await prisma.location.findMany({ where: { tenantId: session.tenantId }, orderBy: { code: "asc" } })
    : [];

  return (
    <div>
      <PageHeader
        title={`Edit ${u.firstName} ${u.lastName}`}
        breadcrumb={{ href: `${portal.base}/dashboard/users/${u.id}`, label: `${u.firstName} ${u.lastName}` }}
      />
      <Card>
        <UserForm
          action={saveUserAction}
          portal={portal.slug}
          values={{
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            roleIds: u.roles.map((r) => r.roleId),
            locationIds: u.locations.map((l) => l.locationId),
          }}
          submitLabel="Save changes"
          cancelHref={`${portal.base}/dashboard/users/${u.id}`}
          redirectOnSuccess={`${portal.base}/dashboard/users/${u.id}`}
          roles={roles.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            permissions: r.permissions.map((p) => p.permission.key),
          }))}
          locations={locations}
          isAdminPortal={isAdminPortal}
          isEdit
        />
      </Card>
    </div>
  );
}
