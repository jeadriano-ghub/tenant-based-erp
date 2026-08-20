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
  const po = await prisma.purchaseOrder.findUnique({ where: { id } } as any);
  if (!po || po.tenantId !== session.tenantId) notFound();

  const supplier = po.supplierId ? await prisma.supplier.findUnique({ where: { id: po.supplierId } } as any) : null;
  const items = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } } as any);
  const productIds = Array.from(new Set(items.map((i: any) => i.productId)));
  const products = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } } as any) : [];
  const productMap = new Map(products.map((p: any) => [p.id, p.name]));
  const stockIns = await prisma.stockIn.findMany({ where: { purchaseOrderId: po.id } } as any);

  const canUpdate = can(keys, "inventory.purchase_order.update");

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Purchase order ${po.referenceNo || `PO ${po.id}`}`}
        description={supplier?.name ?? "Purchase order"}
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
            { label: "Supplier", value: supplier?.name || "—" },
            { label: "Status", value: <Badge tone={STATUS_TONE[po.status] ?? "neutral"}>{po.status}</Badge> },
            { label: "Expected", value: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—" },
            { label: "Received", value: po.receivedDate ? new Date(po.receivedDate).toLocaleDateString() : "—" },
            { label: "Remarks", value: po.remarks || "—" },
          ]}
        />
      </Card>

      <Card title="Items">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No items.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{productMap.get(item.productId) || item.productId}</div>
                  <div className="text-xs text-[var(--muted)]">Qty: {item.quantity} · Unit cost: ₱{Number(item.unitCost).toFixed(2)} · Received: {item.receivedQty}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Summary">
        <DescriptionList
          items={[
            { label: "Subtotal", value: `₱${Number(po.subtotal ?? 0).toFixed(2)}` },
            { label: po.taxExempt ? "Tax (exempt)" : `Tax (${po.taxRate ?? 0}%)`, value: `₱${Number(po.taxAmount ?? 0).toFixed(2)}` },
            { label: "Invoice amount (cost + tax)", value: `₱${Number(Number(po.subtotal ?? 0) + Number(po.taxAmount ?? 0)).toFixed(2)}` },
            { label: "Supplier credit applied", value: `− ₱${Number(po.supplierCreditApplied ?? 0).toFixed(2)}` },
            { label: "Grand total", value: `₱${Math.max(0, Number(po.subtotal ?? 0) + Number(po.taxAmount ?? 0) - Number(po.supplierCreditApplied ?? 0)).toFixed(2)}` },
            { label: "Earned credit", value: po.earnedCredit ? `₱${Number(po.earnedCredit).toFixed(2)} (${po.earnedCreditScope ?? "any"})` : "—" },
          ]}
        />
      </Card>

      <Card title="Stock ins">
        {stockIns.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No stock ins recorded.</p>
        ) : (
          <div className="space-y-2">
            {stockIns.map((si: any) => (
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
