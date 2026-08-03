import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveTenantAction } from "../../../actions";
import { TenantForm } from "../../tenant-form";

export const dynamic = "force-dynamic";

export default async function EditTenantPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId !== null) redirect(`${portal.base}/dashboard`);

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "tenant.update")) redirect(`${portal.base}/dashboard/tenants/${id}`);

  const t = await prisma.tenant.findUnique({ where: { id } });
  if (!t) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit ${t.name}`}
        breadcrumb={{ href: `${portal.base}/dashboard/tenants/${t.id}`, label: t.name }}
      />
      <Card>
        <TenantForm
          action={saveTenantAction}
          portal={portal.slug}
          values={t}
          submitLabel="Save changes"
          cancelHref={`${portal.base}/dashboard/tenants/${t.id}`}
          redirectOnSuccess={`${portal.base}/dashboard/tenants/${t.id}`}
        />
      </Card>
    </div>
  );
}
