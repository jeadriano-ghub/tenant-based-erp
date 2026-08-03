import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveUserAction } from "../../actions";
import { UserForm } from "../user-form";

export const dynamic = "force-dynamic";

export default async function NewUserPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "user.create")) redirect(`${portal.base}/dashboard/users`);
  const isAdminPortal = portal.isAdminPortal;

  const roles = await prisma.role.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } });
  const locations = session.tenantId
    ? await prisma.location.findMany({ where: { tenantId: session.tenantId }, orderBy: { code: "asc" } })
    : [];

  return (
    <div>
      <PageHeader
        title="New user"
        breadcrumb={{ href: `${portal.base}/dashboard/users`, label: "Manage Users" }}
      />
      <Card>
        <UserForm
          action={saveUserAction}
          portal={portal.slug}
          submitLabel="Create user"
          cancelHref={`${portal.base}/dashboard/users`}
          redirectOnSuccess={`${portal.base}/dashboard/users`}
          roles={roles}
          locations={locations}
          isAdminPortal={isAdminPortal}
        />
      </Card>
    </div>
  );
}
