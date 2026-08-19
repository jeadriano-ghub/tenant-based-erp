import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveQuotationAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.quotation.update")) redirect(`${portal.base}/dashboard/inventory/quotations`);

  const base = portal.base;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation || quotation.tenantId !== session.tenantId) notFound();

  const products = await prisma.product.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="Edit quotation" breadcrumb={{ href: `${base}/dashboard/inventory/quotations`, label: "Quotations" }} />
      <Card>
        <ActionForm action={saveQuotationAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/quotations/${id}`}>
          <input type="hidden" name="id" value={quotation.id} />
          <FormSection title="Quotation" description="Update customer, validity, and notes.">
            <Field label="Customer name" name="customerName" required defaultValue={quotation.customerName} />
            <Field label="Email" name="customerEmail" type="email" defaultValue={quotation.customerEmail ?? ""} />
            <Field label="Contact no." name="contactNo" defaultValue={quotation.contactNo ?? ""} />
            <Field label="Expiry date" name="expiryDate" type="date" defaultValue={quotation.expiryDate ? new Date(quotation.expiryDate).toISOString().slice(0, 10) : ""} />
            <Field label="Notes" name="notes" defaultValue={quotation.notes ?? ""} />
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Product</label>
              <select name="productId" required defaultValue={(quotation as any).productId || ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Quantity</label>
              <input type="number" name="quantity" min="1" defaultValue={(quotation as any).quantity || 1} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)]">Unit price</label>
              <input type="number" step="0.01" name="unitPrice" defaultValue={(quotation as any).unitPrice ? String((quotation as any).unitPrice) : ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
