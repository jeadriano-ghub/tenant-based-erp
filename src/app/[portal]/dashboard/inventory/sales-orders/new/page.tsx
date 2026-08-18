import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveSalesOrderAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewSalesOrderPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.sales_order.create")) redirect(`${portal.base}/dashboard/inventory/sales-orders`);

  const base = portal.base;
  const products = await prisma.product.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);

  return (
    <div>
      <PageHeader title="New sales order" description="Create a new sales order." breadcrumb={{ href: `${base}/dashboard/inventory/sales-orders`, label: "Sales orders" }} />
      <Card>
        <ActionForm action={saveSalesOrderAction} portal={slug} submitLabel="Save sales order" cancelHref={`${base}/dashboard/inventory/sales-orders`} redirectOnSuccess={`${base}/dashboard/inventory/sales-orders`}>
          <FormSection title="Sales order" description="Customer and fulfillment details.">
            <select required name="productId" className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
              <option value="">Select product</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Field label="Quantity" name="quantity" type="number" required />
            <Field label="Customer name" name="customerName" required />
            <Field label="Customer email" name="customerEmail" type="email" />
            <Field label="Contact no." name="contactNo" />
            <Field label="Reference no." name="referenceNo" />
            <textarea name="notes" placeholder="Notes" className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
