import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { PageHeader, Card, Badge, LinkButton, DescriptionList, statusTone } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteTenantAction } from "../../actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function TenantDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId !== null) redirect(`${portal.base}/dashboard`);

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "tenant.view")) redirect(`${portal.base}/dashboard`);

  const t = await prisma.tenant.findUnique({
    where: { id },
    include: { _count: { select: { users: true, locations: true, roles: true } } },
  });
  if (!t) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.name}
        description={`${ROOT_DOMAIN}/${t.subdomain}`}
        breadcrumb={{ href: `${portal.base}/dashboard/tenants`, label: "Tenant Management" }}
        action={
          <div className="flex gap-2">
            {can(keys, "tenant.update") && (
              <LinkButton href={`${portal.base}/dashboard/tenants/${t.id}/edit`}>Edit</LinkButton>
            )}
            {can(keys, "tenant.delete") && (
              <DeleteButton
                action={deleteTenantAction}
                portal={portal.slug}
                id={t.id}
                confirmText={`Delete "${t.name}"? All of its users, roles and locations will be removed. This cannot be undone.`}
              />
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(t.status)}>{t.status}</Badge>
        <Badge tone="brand">{t.type}</Badge>
        <Badge>{t._count.users} users</Badge>
        <Badge>{t._count.locations} locations</Badge>
        <Badge>{t._count.roles} roles</Badge>
      </div>

      <Card title="Identity">
        <DescriptionList
          items={[
            { label: "Tenant name", value: t.name },
            { label: "Workspace URL", value: <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs">{ROOT_DOMAIN}/{t.subdomain}</code> },
            { label: "Tenant type", value: t.type },
            {
              label: "Logo",
              value: t.logoUrl ? (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.logoUrl}
                    alt={`${t.name} logo`}
                    className="h-14 w-14 rounded-lg border bg-[var(--background)] object-contain"
                  />
                  <a className="text-xs text-[var(--brand)] hover:underline break-all" href={t.logoUrl} target="_blank" rel="noreferrer">
                    {t.logoUrl}
                  </a>
                </div>
              ) : (
                <span className="text-[var(--muted)]">No logo</span>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Contact">
        <DescriptionList
          items={[
            { label: "Contact person", value: t.contactPerson },
            { label: "Email address", value: <a className="text-[var(--brand)] hover:underline" href={`mailto:${t.email}`}>{t.email}</a> },
            { label: "Contact no.", value: <a className="text-[var(--brand)] hover:underline" href={`tel:${t.contactNo}`}>{t.contactNo}</a> },
          ]}
        />
      </Card>

      <Card title="Company">
        <DescriptionList
          items={[
            { label: "Company name", value: t.companyName },
            { label: "Industry", value: t.industry },
            { label: "TIN", value: t.tin },
            { label: "Business reg. no.", value: t.businessRegNo },
            { label: "Website", value: t.website },
          ]}
        />
      </Card>

      <Card title="Address">
        <DescriptionList
          items={[
            { label: "Address line 1", value: t.addressLine1 },
            { label: "Address line 2", value: t.addressLine2 },
            { label: "City", value: t.city },
            { label: "State / Province", value: t.stateProvince },
            { label: "Postal code", value: t.postalCode },
            { label: "Country", value: t.country },
          ]}
        />
      </Card>

      <Card title="Subscription & billing">
        <DescriptionList
          items={[
            { label: "Subscription start", value: fmt(t.subscriptionStart) },
            { label: "Subscription end", value: fmt(t.subscriptionEnd) },
            { label: "Billing cycle", value: t.billingCycle },
            { label: "Payment method", value: t.paymentMethod.replaceAll("_", " ") },
            { label: "Status", value: <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
            { label: "Created", value: t.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>
    </div>
  );
}
