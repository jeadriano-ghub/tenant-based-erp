import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { PurchaseOrderForm } from "../PurchaseOrderForm";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.purchase_order.create")) redirect(`${portal.base}/dashboard/inventory/purchase-orders`);

  const base = portal.base;
  const [suppliers, products, categories, tenant] = await Promise.all([
    prisma.supplier.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any),
    prisma.product.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, costPrice: true, categoryId: true } } as any),
    prisma.category.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" }, select: { id: true, name: true } } as any),
    prisma.tenant.findUnique({ where: { id: session.tenantId! }, select: { globalTaxRate: true } } as any),
  ]);

  return (
    <div>
      <PageHeader title="New purchase order" description="Create a new purchase order." breadcrumb={{ href: `${base}/dashboard/inventory/purchase-orders`, label: "Purchase orders" }} />
      <Card>
        <PurchaseOrderForm
          suppliers={(suppliers as any[]).map((s) => ({ id: s.id, name: s.name, termsDays: s.termsDays ?? 30 }))}
          products={(products as any[]).map((p) => ({ id: p.id, name: p.name, sku: p.sku, costPrice: p.costPrice ? Number(p.costPrice) : null, categoryId: p.categoryId }))}
          categories={(categories as any[]).map((c) => ({ id: c.id, name: c.name }))}
          globalTaxRate={tenant?.globalTaxRate ?? 0}
          portal={slug}
          redirectOnSuccess={`${base}/dashboard/inventory/purchase-orders`}
          cancelHref={`${base}/dashboard/inventory/purchase-orders`}
        />
      </Card>
    </div>
  );
}
