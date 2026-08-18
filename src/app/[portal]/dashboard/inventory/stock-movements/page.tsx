import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  PURCHASE: "success",
  SALE: "danger",
  ADJUSTMENT: "warning",
  RETURN: "brand",
  TRANSFER: "neutral",
};

export default async function StockMovementsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.stock_movement.view")) redirect(`${portal.base}/dashboard`);

  const base = portal.base;
  const rawMovements = await prisma.stockMovement.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  const productIds = Array.from(new Set(rawMovements.map((m) => m.productId)));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } } as any);
  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const movements = rawMovements.map((m) => ({ ...m, product: productMap.get(m.productId) || null } as any));
  const canCreate = can(keys, "inventory.stock_movement.create");

  return (
    <div>
      <PageHeader
        title="Stock movements"
        description="All inbound, outbound, and adjustment records."
        action={
          canCreate ? (
            <a className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90" href={`${base}/dashboard/inventory/pos`}>
              New movement
            </a>
          ) : undefined
        }
      />
      <Card>
        {movements.length === 0 ? (
          <EmptyState title="No stock movements" action={canCreate ? <a className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90" href={`${base}/dashboard/inventory/pos`}>Record movement</a> : undefined} />
        ) : (
          <ResponsiveList
            rows={movements}
            href={(m) => `${base}/dashboard/inventory/stock-movements/${m.id}`}
            primary={(m) => m.product?.name || m.productId}
            secondary={(m) => `${m.type} · ${m.quantity}`}
            meta={(m) => [{ label: "Type", value: <Badge tone={TYPE_TONE[m.type] ?? "neutral"}>{m.type}</Badge> }]}
            columns={[
              { key: "product", header: "Product", cell: (m) => m.product?.name || m.productId },
              { key: "type", header: "Type", cell: (m) => <Badge tone={TYPE_TONE[m.type] ?? "neutral"}>{m.type}</Badge> },
              { key: "qty", header: "Quantity", cell: (m) => m.quantity },
              { key: "ref", header: "Reference", cell: (m) => m.reference || "—" },
              { key: "createdAt", header: "Date", cell: (m) => m.createdAt ? new Date(m.createdAt).toLocaleString() : "—" },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
