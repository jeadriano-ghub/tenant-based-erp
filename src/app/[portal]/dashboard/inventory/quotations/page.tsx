import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  SENT: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  CONVERTED: "brand",
};

export default async function QuotationsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.quotation.view")) redirect(`${portal.base}/dashboard`);

  const base = portal.base;
  const quotations = await prisma.quotation.findMany({ where: { tenantId: session.tenantId! }, orderBy: { createdAt: "desc" } });
  const canCreate = can(keys, "inventory.quotation.create");

  return (
    <div>
      <PageHeader title="Quotations" description="Sales quotations you can convert to orders." action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/quotations/new`}>New quotation</LinkButton> : undefined} />
      <Card>
        {quotations.length === 0 ? (
          <EmptyState title="No quotations" action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/quotations/new`}>New quotation</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={quotations}
            href={(q) => `${base}/dashboard/inventory/quotations/${q.id}`}
            primary={(q) => q.referenceNo || `QUO ${q.id}`}
            secondary={(q) => q.customerName}
            meta={(q) => [{ label: "Status", value: <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge> }]}
            columns={[
              { key: "ref", header: "Reference", cell: (q) => q.referenceNo || `QUO ${q.id}` },
              { key: "customer", header: "Customer", cell: (q) => q.customerName },
              { key: "status", header: "Status", cell: (q) => <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge> },
              { key: "expiry", header: "Expires", cell: (q) => q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : "—" },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
