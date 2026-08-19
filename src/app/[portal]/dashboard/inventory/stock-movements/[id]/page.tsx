import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, DescriptionList } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<string, "success" | "danger" | "warning" | "neutral" | "brand"> = {
  PURCHASE: "success",
  SALE: "danger",
  ADJUSTMENT: "warning",
};

export default async function StockMovementDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.stock_movement.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const movement = await prisma.stockMovement.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!movement || movement.tenantId !== session.tenantId) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Stock movement ${movement.id}`}
        breadcrumb={{ href: `${base}/dashboard/inventory/stock-movements`, label: "Stock movements" }}
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Type", value: <Badge tone={TYPE_TONE[movement.type] ?? "neutral"}>{movement.type}</Badge> },
            { label: "Product", value: movement.product?.name || movement.productId },
            { label: "Quantity", value: String(movement.quantity) },
            { label: "Reference", value: movement.reference || "—" },
            { label: "Notes", value: movement.notes || "—" },
            { label: "Created", value: movement.createdAt.toISOString().slice(0, 19).replace("T", " ") },
          ]}
        />
      </Card>
    </div>
  );
}
