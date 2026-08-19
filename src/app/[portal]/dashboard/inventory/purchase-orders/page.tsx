import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  SUBMITTED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

export default async function PurchaseOrdersPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.purchase_order.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { tenantId: session.tenantId! },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });
  const canCreate = can(keys, "inventory.purchase_order.create");

  return (
    <div>
      <PageHeader title="Purchase orders" description="Procurement orders and receipt status." action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/purchase-orders/new`}>New purchase order</LinkButton> : undefined} />
      <Card>
        {purchaseOrders.length === 0 ? (
          <EmptyState title="No purchase orders" action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/purchase-orders/new`}>New purchase order</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={purchaseOrders}
            href={(po) => `${base}/dashboard/inventory/purchase-orders/${po.id}`}
            primary={(po) => po.referenceNo || `PO ${po.id}`}
            secondary={(po) => po.supplier?.name || ""}
            meta={(po) => [{ label: "Status", value: <Badge tone={STATUS_TONE[po.status] ?? "neutral"}>{po.status}</Badge> }]}
            columns={[
              { key: "ref", header: "Reference", cell: (po) => po.referenceNo || `PO ${po.id}` },
              { key: "supplier", header: "Supplier", cell: (po) => po.supplier?.name || "—" },
              { key: "status", header: "Status", cell: (po) => <Badge tone={STATUS_TONE[po.status] ?? "neutral"}>{po.status}</Badge> },
              { key: "expected", header: "Expected", cell: (po) => po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—" },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
