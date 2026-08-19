import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  CONFIRMED: "warning",
  FULFILLED: "success",
  CANCELLED: "danger",
};

export default async function SalesOrdersPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.sales_order.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const salesOrders = await prisma.salesOrder.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { createdAt: "desc" },
  } as any);
  const canCreate = can(keys, "inventory.sales_order.create");

  return (
    <div>
      <PageHeader title="Sales orders" description="Order fulfillment and stock-out flow." action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/sales-orders/new`}>New sales order</LinkButton> : undefined} />
      <Card>
        {salesOrders.length === 0 ? (
          <EmptyState title="No sales orders" action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/sales-orders/new`}>New sales order</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={salesOrders}
            href={(so) => `${base}/dashboard/inventory/sales-orders/${so.id}`}
            primary={(so) => so.referenceNo || `SO ${so.id}`}
            secondary={(so) => so.customerName}
            meta={(so) => [{ label: "Status", value: <Badge tone={STATUS_TONE[so.status] ?? "neutral"}>{so.status}</Badge> }]}
            columns={[
              { key: "ref", header: "Reference", cell: (so) => so.referenceNo || `SO ${so.id}` },
              { key: "customer", header: "Customer", cell: (so) => so.customerName },
              { key: "status", header: "Status", cell: (so) => <Badge tone={STATUS_TONE[so.status] ?? "neutral"}>{so.status}</Badge> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
