import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { savePurchaseOrderAction } from "../../../actions";

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
  const suppliers = await prisma.supplier.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);

  return (
    <div>
      <PageHeader title="New purchase order" description="Create a new purchase order." breadcrumb={{ href: `${base}/dashboard/inventory/purchase-orders`, label: "Purchase orders" }} />
      <Card>
        <ActionForm action={savePurchaseOrderAction} portal={slug} submitLabel="Save purchase order" cancelHref={`${base}/dashboard/inventory/purchase-orders`} redirectOnSuccess={`${base}/dashboard/inventory/purchase-orders`}>
          <FormSection title="Purchase order" description="Basic procurement details.">
            <select required name="supplierId" className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
              <option value="">Select supplier</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Field label="Reference no." name="referenceNo" />
            <Field label="Expected date" name="expectedDate" type="date" />
            <Field label="Notes" name="notes" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
