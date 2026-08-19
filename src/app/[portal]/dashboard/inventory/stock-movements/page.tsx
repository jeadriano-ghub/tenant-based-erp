import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  STOCK_IN: "success",
  STOCK_OUT: "danger",
  ADJUSTMENT: "warning",
};

export default async function StockMovementsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.stock_movement.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const stockMovements: any[] = await prisma.stockMovement.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  const productIds = Array.from(new Set(stockMovements.map((sm: any) => sm.productId).filter(Boolean)));
  const products: any[] = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productMap = new Map(products.map((p: any) => [p.id, p.name]));
  const canCreate = can(keys, "inventory.stock_movement.create");

  return (
    <div>
      <PageHeader
        title="Stock movements"
        description="Stock in, stock out, and manual adjustments."
        action={
          canCreate ? <LinkButton href={`${base}/dashboard/inventory/stock-movements/new`}>New stock movement</LinkButton> : undefined
        }
      />
      <Card>
        {stockMovements.length === 0 ? (
          <EmptyState
            title="No stock movements yet"
            action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/stock-movements/new`}>New stock movement</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={stockMovements}
            href={(sm) => `${base}/dashboard/inventory/stock-movements/${sm.id}`}
            primary={(sm) => productMap.get(sm.productId) || sm.productId}
            secondary={(sm) => sm.referenceNo || `SM ${sm.id}`}
            meta={(sm) => [
              { label: "Type", value: <Badge tone={TYPE_TONE[sm.movementType] ?? "neutral"}>{sm.movementType}</Badge> },
              { label: "Qty", value: `${sm.quantity}` },
              { label: "Date", value: sm.movementDate ? new Date(sm.movementDate).toLocaleDateString() : "—" },
            ]}
            columns={[
              { key: "ref", header: "Reference", cell: (sm) => sm.referenceNo || `SM ${sm.id}` },
              { key: "product", header: "Product", cell: (sm) => productMap.get(sm.productId) || sm.productId },
              { key: "type", header: "Type", cell: (sm) => <Badge tone={TYPE_TONE[sm.movementType] ?? "neutral"}>{sm.movementType}</Badge> },
              { key: "qty", header: "Quantity", cell: (sm) => sm.quantity },
              { key: "date", header: "Date", cell: (sm) => sm.movementDate ? new Date(sm.movementDate).toLocaleDateString() : "—" },
            ]}
            actions={(sm) => (
              <div className="flex flex-wrap gap-2">
                {canCreate && (
                  <LinkButton href={`${base}/dashboard/inventory/stock-movements/${sm.id}`} variant="secondary" size="sm">View</LinkButton>
                )}
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
}
