import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  CONFIRMED: "warning",
  FULFILLED: "success",
  CANCELLED: "danger",
};

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.sales_order.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const so = await prisma.salesOrder.findUnique({ where: { id } } as any);
  if (!so || so.tenantId !== session.tenantId) notFound();

  const items = await prisma.salesOrderItem.findMany({ where: { salesOrderId: so.id } } as any);
  const productIds = Array.from(new Set(items.map((i: any) => i.productId)));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } } as any)
    : [];
  const productMap = new Map(products.map((p: any) => [p.id, p.name]));

  const statusTone = STATUS_TONE[so.status as string] ?? "neutral";
  const canUpdate = can(keys, "inventory.sales_order.update");

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Sales order ${(so.referenceNo as string) || `SO ${so.id}`}`}
        description={so.customerName}
        breadcrumb={{ href: `${base}/dashboard/inventory/sales-orders`, label: "Sales orders" }}
        action={
          <div className="flex gap-2">
            {canUpdate && <LinkButton href={`${base}/dashboard/inventory/sales-orders/${so.id}/edit`}>Edit</LinkButton>}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Reference", value: (so.referenceNo as string) || `SO ${so.id}` },
            { label: "Customer", value: so.customerName },
            { label: "Email", value: (so.customerEmail as string) || "—" },
            { label: "Contact", value: (so.contactNo as string) || "—" },
            { label: "Shipping", value: ((so.shippingAddress as string) || "—") },
            { label: "Status", value: <Badge tone={statusTone}>{(so.status as string) || "—"}</Badge> },
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
                  <div className="text-xs text-[var(--muted)]">Qty: {item.quantity} · Unit price: ₱{Number(item.unitPrice).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
