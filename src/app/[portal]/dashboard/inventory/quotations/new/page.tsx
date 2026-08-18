import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveQuotationAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.quotation.create")) redirect(`${portal.base}/dashboard/inventory/quotations`);

  const base = portal.base;
  const products = await prisma.product.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);

  return (
    <div>
      <PageHeader title="New quotation" description="Create a new sales quotation." breadcrumb={{ href: `${base}/dashboard/inventory/quotations`, label: "Quotations" }} />
      <Card>
        <ActionForm action={saveQuotationAction} portal={slug} submitLabel="Save quotation" cancelHref={`${base}/dashboard/inventory/quotations`} redirectOnSuccess={`${base}/dashboard/inventory/quotations`}>
          <FormSection title="Quotation" description="Customer and validity details.">
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
            <Field label="Expiry date" name="expiryDate" type="date" />
            <textarea name="notes" placeholder="Notes" className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
