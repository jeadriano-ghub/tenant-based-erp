import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveTenantAction } from "../../actions";
import { TenantForm } from "../tenant-form";

export const dynamic = "force-dynamic";

export default async function NewTenantPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId !== null) redirect(`${portal.base}/dashboard`);

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "tenant.create")) redirect(`${portal.base}/dashboard/tenants`);

  return (
    <div>
      <PageHeader
        title="New tenant"
        description="Provision a new tenant workspace."
        breadcrumb={{ href: `${portal.base}/dashboard/tenants`, label: "Tenant Management" }}
      />
      <Card>
        <TenantForm
          action={saveTenantAction}
          portal={portal.slug}
          submitLabel="Create tenant"
          cancelHref={`${portal.base}/dashboard/tenants`}
          redirectOnSuccess={`${portal.base}/dashboard/tenants`}
        />
      </Card>
    </div>
  );
}
