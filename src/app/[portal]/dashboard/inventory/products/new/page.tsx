import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveProductAction } from "../../../actions";
import { ProductFormFields } from "../ProductFormFields";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ portal: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.create")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const presetCategoryId = typeof sp.categoryId === "string" ? sp.categoryId : "";

  const base = portal.base;
  const categories = await prisma.category.findMany({ where: { tenantId: session.tenantId!, isActive: true }, orderBy: { name: "asc" } });
  const brands = await prisma.brand.findMany({ where: { tenantId: session.tenantId!, isActive: true }, orderBy: { name: "asc" } });

  const categoryOptions = (categories as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parentId ?? null,
    fields: Array.isArray(c.fields) ? c.fields : (c.fields ? [] : []),
  }));

  return (
    <div>
      <PageHeader title="New product" description="Add a new item to the catalog." breadcrumb={{ href: `${base}/dashboard/inventory/products`, label: "Products" }} />
      <Card>
        <ActionForm action={saveProductAction} portal={slug} submitLabel="Save product" cancelHref={`${base}/dashboard/inventory/products`} redirectOnSuccess={`${base}/dashboard/inventory/products`}>
          <FormSection title="Identity" description="Core product details used in transactions.">
            <Field label="SKU" name="sku" required />
            <Field label="Product name" name="name" required />
            <ProductFormFields
              productType="NON_SERIALIZED"
              categoryOptions={categoryOptions}
              brandOptions={brands as any}
              defaultCategoryId={presetCategoryId}
            />
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
