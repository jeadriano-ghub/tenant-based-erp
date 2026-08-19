import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveRoleAction } from "../../../actions";
import { RoleForm } from "../../role-form";
import { TENANT_ASSIGNABLE } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function EditRolePage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "role.update")) redirect(`${portal.base}/dashboard/roles/${id}`);
  const isAdminPortal = portal.isAdminPortal;

  const role = await prisma.role.findUnique({ where: { id }, include: { permissions: true } });
  if (!role || role.tenantId !== session.tenantId) notFound();

  const allPermissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
  const permissions = isAdminPortal ? allPermissions : allPermissions.filter((p) => TENANT_ASSIGNABLE.some((tp) => tp.key === p.key));

  return (
    <div>
      <PageHeader title={`Edit ${role.name}`} breadcrumb={{ href: `${portal.base}/dashboard/roles/${role.id}`, label: role.name }} />
      <Card>
        <RoleForm
          action={saveRoleAction}
          portal={portal.slug}
          values={{
            id: role.id,
            name: role.name,
            description: role.description,
            permissionIds: role.permissions.map((p) => p.permissionId),
          }}
          submitLabel="Save changes"
          cancelHref={`${portal.base}/dashboard/roles/${role.id}`}
          redirectOnSuccess={`${portal.base}/dashboard/roles/${role.id}`}
          permissions={permissions}
          isAdminPortal={isAdminPortal}
        />
      </Card>
    </div>
  );
}
