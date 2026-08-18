import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field, Select } from "@/components/form";
import { saveProductAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.update")) redirect(`${portal.base}/dashboard/inventory`);

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true },
  } as any);
  if (!product || product.tenantId !== session.tenantId) notFound();

  const categories = await prisma.category.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);
  const brands = await prisma.brand.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);

  const base = portal.base;

  return (
    <div>
      <PageHeader title="Edit product" breadcrumb={{ href: `${base}/dashboard/inventory/products`, label: "Products" }} />
      <Card>
        <ActionForm action={saveProductAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory`}>
          <input type="hidden" name="id" value={product.id} />
          <FormSection title="Product" description="Core item master data.">
            <Field label="Name" name="name" required defaultValue={product.name} />
            <Field label="SKU" name="sku" required defaultValue={product.sku} />
            <Field label="Description" name="description" type="textarea" defaultValue={product.description || ""} />
            <Select label="Type" name="productType" required options={["SERIALIZED", "NON_SERIALIZED", "BARCODE"]} defaultValue={product.productType} />
            <Field label="Unit of measure" name="unitOfMeasure" placeholder="pc" defaultValue={product.unitOfMeasure || "pc"} />
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Cost price</label>
              <input type="number" step="0.01" name="costPrice" defaultValue={product.costPrice ? String(product.costPrice) : ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Selling price</label>
              <input type="number" step="0.01" name="sellingPrice" defaultValue={product.sellingPrice ? String(product.sellingPrice) : ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <Field label="Min stock level" name="minStockLevel" placeholder="0" defaultValue={product.minStockLevel != null ? String(product.minStockLevel) : ""} />
            <Field label="Reorder point" name="reorderPoint" placeholder="0" defaultValue={product.reorderPoint != null ? String(product.reorderPoint) : ""} />
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Category</label>
              <select name="categoryId" required defaultValue={product.categoryId} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
                <option value="">Select category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Brand</label>
              <select name="brandId" defaultValue={product.brandId || ""} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
                <option value="">None</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Status</label>
              <select name="isActive" defaultValue={product.isActive ? "true" : "false"} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
