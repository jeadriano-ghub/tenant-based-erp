import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveRoleAction } from "../../actions";
import { RoleForm } from "../role-form";

export const dynamic = "force-dynamic";

export default async function NewRolePage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "role.create")) redirect(`${portal.base}/dashboard/roles`);
  const isAdminPortal = portal.isAdminPortal;

  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });

  return (
    <div>
      <PageHeader title="New role" breadcrumb={{ href: `${portal.base}/dashboard/roles`, label: "Roles" }} />
      <Card>
        <RoleForm
          action={saveRoleAction}
          portal={portal.slug}
          submitLabel="Create role"
          cancelHref={`${portal.base}/dashboard/roles`}
          redirectOnSuccess={`${portal.base}/dashboard/roles`}
          permissions={permissions}
          isAdminPortal={isAdminPortal}
        />
      </Card>
    </div>
  );
}
