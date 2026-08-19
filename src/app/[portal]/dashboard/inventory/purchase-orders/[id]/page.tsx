import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { savePurchaseOrderAction } from "../../../actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  SUBMITTED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.purchase_order.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { product: true } }, stockIns: true },
  });
  if (!po || po.tenantId !== session.tenantId) notFound();

  const canUpdate = can(keys, "inventory.purchase_order.update");

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Purchase order ${po.referenceNo || `PO ${po.id}`}`}
        description={po.supplier?.name ?? "Purchase order"}
        breadcrumb={{ href: `${base}/dashboard/inventory/purchase-orders`, label: "Purchase orders" }}
        action={
          <div className="flex gap-2">
            {canUpdate && <LinkButton href={`${base}/dashboard/inventory/purchase-orders/${po.id}/edit`}>Edit</LinkButton>}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Reference", value: po.referenceNo || `PO ${po.id}` },
            { label: "Supplier", value: po.supplier?.name || "—" },
            { label: "Status", value: <Badge tone={STATUS_TONE[po.status] ?? "neutral"}>{po.status}</Badge> },
            { label: "Expected", value: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—" },
            { label: "Received", value: po.receivedDate ? new Date(po.receivedDate).toLocaleDateString() : "—" },
          ]}
        />
      </Card>

      <Card title="Items">
        {po.items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No items.</p>
        ) : (
          <div className="space-y-2">
            {po.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{item.product?.name || item.productId}</div>
                  <div className="text-xs text-[var(--muted)]">Qty: {item.quantity} · Unit cost: ₱{Number(item.unitCost).toFixed(2)} · Received: {item.receivedQty}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Stock ins">
        {po.stockIns.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No stock ins recorded.</p>
        ) : (
          <div className="space-y-2">
            {po.stockIns.map((si) => (
              <div key={si.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="font-medium">{si.referenceNo || `StockIn ${si.id}`}</div>
                <div className="text-xs text-[var(--muted)]">Received: {new Date(si.receivedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
