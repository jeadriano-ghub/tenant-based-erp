import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { savePurchaseOrderAction } from "../../../../actions";

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
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!po || po.tenantId !== session.tenantId) notFound();

  const suppliers = await prisma.supplier.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="Edit purchase order" breadcrumb={{ href: `${base}/dashboard/inventory/purchase-orders`, label: "Purchase orders" }} />
      <Card>
        <ActionForm action={savePurchaseOrderAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/purchase-orders/${id}`}>
          <input type="hidden" name="id" value={po.id} />
          <FormSection title="Purchase order" description="Update supplier, expected date, and notes.">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Reference</label>
              <input type="text" name="referenceNo" defaultValue={po.referenceNo ?? ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Supplier</label>
              <select name="supplierId" required defaultValue={po.supplierId} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Expected date</label>
              <input type="date" name="expectedDate" defaultValue={po.expectedDate ? new Date(po.expectedDate).toISOString().slice(0, 10) : ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <Field label="Notes" name="notes" defaultValue={po.notes ?? ""} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
