import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { PurchaseOrderForm } from "../../PurchaseOrderForm";

export const dynamic = "force-dynamic";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.purchase_order.update")) redirect(`${portal.base}/dashboard/inventory/purchase-orders`);

  const base = portal.base;
  const po: any = await prisma.purchaseOrder.findUnique({ where: { id } } as any);
  if (!po || po.tenantId !== session.tenantId) notFound();

  const [suppliers, products, categories, tenant] = await Promise.all([
    prisma.supplier.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any),
    prisma.product.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, costPrice: true, categoryId: true } } as any),
    prisma.category.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" }, select: { id: true, name: true } } as any),
    prisma.tenant.findUnique({ where: { id: session.tenantId! }, select: { globalTaxRate: true } } as any),
  ]);

  const earnedCategoryIds: string[] = Array.isArray(po.earnedCreditCategoryIds) ? po.earnedCreditCategoryIds : [];
  const earnedProductIds: string[] = Array.isArray(po.earnedCreditProductIds) ? po.earnedCreditProductIds : [];

  return (
    <div>
      <PageHeader title="Edit purchase order" breadcrumb={{ href: `${base}/dashboard/inventory/purchase-orders`, label: "Purchase orders" }} />
      <Card>
        <PurchaseOrderForm
          suppliers={(suppliers as any[]).map((s) => ({ id: s.id, name: s.name, termsDays: s.termsDays ?? 30 }))}
          products={(products as any[]).map((p) => ({ id: p.id, name: p.name, sku: p.sku, costPrice: p.costPrice ? Number(p.costPrice) : null, categoryId: p.categoryId }))}
          categories={(categories as any[]).map((c) => ({ id: c.id, name: c.name }))}
          globalTaxRate={tenant?.globalTaxRate ?? 0}
          portal={slug}
          redirectOnSuccess={`${base}/dashboard/inventory/purchase-orders/${id}`}
          cancelHref={`${base}/dashboard/inventory/purchase-orders/${id}`}
          defaults={{
            supplierId: po.supplierId,
            referenceNo: po.referenceNo ?? "",
            termsDays: po.termsDays,
            expectedDate: po.expectedDate ? new Date(po.expectedDate).toISOString().slice(0, 10) : "",
            notes: po.notes ?? "",
            remarks: po.remarks ?? "",
            taxExempt: po.taxExempt,
            taxRate: po.taxRate,
            supplierCreditApplied: po.supplierCreditApplied,
            earnedCredit: po.earnedCredit,
            earnedCreditScope: po.earnedCreditScope ?? "any",
            earnedCreditCategoryIds: earnedCategoryIds,
            earnedCreditProductIds: earnedProductIds,
          }}
        />
        <input type="hidden" name="id" value={po.id} />
      </Card>
    </div>
  );
}
