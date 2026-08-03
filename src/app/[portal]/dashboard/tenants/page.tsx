import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { PageHeader, Card, Badge, LinkButton, EmptyState, statusTone } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function TenantsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId !== null) redirect(`${portal.base}/dashboard`);

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "tenant.view")) redirect(`${portal.base}/dashboard`);

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, locations: true } } },
  });

  const canCreate = can(keys, "tenant.create");

  return (
    <div>
      <PageHeader
        title="Tenant Management"
        description={`Each tenant gets a workspace at ${ROOT_DOMAIN}/[tenant]`}
        action={canCreate ? <LinkButton href={`${portal.base}/dashboard/tenants/new`}>New tenant</LinkButton> : undefined}
      />

      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            title="No tenants yet"
            description="Create your first tenant to provision a workspace."
            action={canCreate ? <LinkButton href={`${portal.base}/dashboard/tenants/new`}>New tenant</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={tenants}
            href={(t) => `${portal.base}/dashboard/tenants/${t.id}`}
            primary={(t) => t.name}
            secondary={(t) => `${ROOT_DOMAIN}/${t.subdomain}`}
            meta={(t) => [
              { label: "Status", value: <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
              { label: "Type", value: t.type },
              { label: "Users", value: t._count.users },
              { label: "Billing", value: t.billingCycle },
            ]}
            columns={[
              {
                key: "name",
                header: "Tenant",
                cell: (t) => (
                  <span className="block">
                    {t.name}
                    <span className="block text-xs font-normal text-[var(--muted)]">{t.companyName}</span>
                  </span>
                ),
              },
              { key: "url", header: "Workspace", cell: (t) => <span className="text-[var(--muted)]">/{t.subdomain}</span> },
              { key: "type", header: "Type", hideBelow: "lg", cell: (t) => t.type },
              {
                key: "contact",
                header: "Contact",
                hideBelow: "xl",
                cell: (t) => (
                  <span className="block">
                    {t.contactPerson}
                    <span className="block text-xs text-[var(--muted)]">{t.email}</span>
                  </span>
                ),
              },
              { key: "users", header: "Users", hideBelow: "lg", cell: (t) => t._count.users },
              { key: "status", header: "Status", cell: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
            ]}
            actions={(t) => <LinkButton href={`${portal.base}/dashboard/tenants/${t.id}`} variant="secondary" size="sm">View</LinkButton>}
          />
        )}
      </Card>
    </div>
  );
}
