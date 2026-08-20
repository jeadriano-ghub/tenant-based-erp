import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveProductAction } from "../../../actions";
import { ProductFormFields } from "../ProductFormFields";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.create")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const categories = await prisma.category.findMany({ where: { tenantId: session.tenantId!, isActive: true }, orderBy: { name: "asc" } });
  const brands = await prisma.brand.findMany({ where: { tenantId: session.tenantId!, isActive: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="New product" description="Add a new item to the catalog." breadcrumb={{ href: `${base}/dashboard/inventory/products`, label: "Products" }} />
      <Card>
        <ActionForm action={saveProductAction} portal={slug} submitLabel="Save product" cancelHref={`${base}/dashboard/inventory/products`} redirectOnSuccess={`${base}/dashboard/inventory/products`}>
          <FormSection title="Identity" description="Core product details used in transactions.">
            <Field label="SKU" name="sku" required />
            <Field label="Product name" name="name" required />
            <ProductFormFields productType="NON_SERIALIZED" />
            <select required name="categoryId" defaultValue="" className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20">
              <option value="">Select category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="brandId" defaultValue="" className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20">
              <option value="">No brand</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <Field label="Unit of measure" name="unitOfMeasure" defaultValue="pc" />
            <div className="sm:col-span-2">
              <Field label="Description" name="description" />
            </div>
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
