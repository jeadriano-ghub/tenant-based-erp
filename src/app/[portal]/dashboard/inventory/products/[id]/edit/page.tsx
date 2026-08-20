import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveProductAction } from "../../../../actions";
import { ProductFormFields, type PriceTier, type BarcodeRow } from "../../ProductFormFields";

export const dynamic = "force-dynamic";

const uid = () => Math.random().toString(36).slice(2, 9);

async function encodePrices(p: any): Promise<PriceTier[]> {
  try {
    const arr = Array.isArray(p) ? p : JSON.parse(p ?? "[]");
    return (arr as any[]).map((x) => ({
      id: uid(),
      name: String(x.name ?? ""),
      price: x.price != null ? String(x.price) : "",
      minQty: x.minQty != null ? String(x.minQty) : "",
    }));
  } catch {
    return [{ id: uid(), name: "Default", price: "", minQty: "" }];
  }
}

export default async function EditProductPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.update")) redirect(`${portal.base}/dashboard/inventory/products`);

  const product: any = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true, barcodes: true, serials: true } as any,
  });
  if (!product || product.tenantId !== session.tenantId) notFound();

  const categories = await prisma.category.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);
  const brands = await prisma.brand.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } } as any);

  const base = portal.base;
  const prices = await encodePrices(product.prices);
  const barcodes: BarcodeRow[] = (product.barcodes ?? []).map((b: any) => ({ id: uid(), barcode: b.barcode, format: b.format ?? "CODE128", isPrimary: Boolean(b.isPrimary) }));

  const categoryOptions = (categories as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    fields: Array.isArray(c.fields) ? c.fields : [],
  }));

  return (
    <div>
      <PageHeader title="Edit product" breadcrumb={{ href: `${base}/dashboard/inventory/products`, label: "Products" }} />
      <Card>
        <ActionForm action={saveProductAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/products`}>
          <input type="hidden" name="id" value={product.id} />
          <FormSection title="Identity" description="Core product details used in transactions.">
            <Field label="SKU" name="sku" required defaultValue={product.sku} />
            <Field label="Product name" name="name" required defaultValue={product.name} />
            <ProductFormFields
              productType={product.productType}
              costPrice={product.costPrice != null ? String(product.costPrice) : ""}
              sellingPrice={product.sellingPrice != null ? String(product.sellingPrice) : ""}
              initialPrices={prices}
              initialBarcodes={barcodes}
              categoryOptions={categoryOptions}
              brandOptions={brands as any}
              defaultCategoryId={product.categoryId}
              defaultBrandId={product.brandId || ""}
            />
            <Field label="Unit of measure" name="unitOfMeasure" defaultValue={product.unitOfMeasure || "pc"} />
            <div className="sm:col-span-2">
              <Field label="Description" name="description" defaultValue={product.description || ""} />
            </div>
            <Field label="Min stock level" name="minStockLevel" type="number" defaultValue={product.minStockLevel != null ? String(product.minStockLevel) : "0"} />
            <Field label="Reorder point" name="reorderPoint" type="number" defaultValue={product.reorderPoint != null ? String(product.reorderPoint) : "0"} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
