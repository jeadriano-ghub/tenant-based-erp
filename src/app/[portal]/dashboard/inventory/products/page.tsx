import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  SERIALIZED: "Serialized",
  NON_SERIALIZED: "Non-serialized",
  BARCODE: "Barcode",
};

export default async function ProductsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const canCreate = can(keys, "inventory.product.create");
  const canUpdate = can(keys, "inventory.product.update");

  // Safe queries - avoid Prisma include type mismatches
  const products: any[] = await prisma.product.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { updatedAt: "desc" },
  });

  const categories: any[] = await prisma.category.findMany({
    where: { tenantId: session.tenantId! },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const categoryMap = new Map(categories.map((c: any) => [c.id, c.name as string]));

  const brands: any[] = await prisma.brand.findMany({
    where: { tenantId: session.tenantId! },
    select: { id: true, name: true },
  });
  const brandMap = new Map(brands.map((b: any) => [b.id, b.name as string]));

  return (
    <div>
      <PageHeader
        title="Products"
        description="Item master data by type, category, and brand."
        action={
          canCreate ? <LinkButton href={`${base}/dashboard/inventory/products/new`}>New product</LinkButton> : undefined
        }
      />
      <Card>
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/products/new`}>New product</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={products as any}
            href={(p: any) => `${base}/dashboard/inventory/products/${p.id}/edit`}
            primary={(p: any) => `${p.name} ${p.sku ? `(${p.sku})` : ""}`}
            secondary={(p: any) => brandMap.get(p.brandId || "") || categoryMap.get(p.categoryId) || ""}
            meta={(p: any) => [
              { label: "Type", value: PRODUCT_TYPE_LABEL[p.productType] || p.productType },
              { label: "Price", value: p.sellingPrice ? `₱${Number(p.sellingPrice).toFixed(2)}` : "—" },
            ]}
            columns={[
              { key: "name", header: "Product", cell: (p: any) => `${p.name}${p.sku ? ` (${p.sku})` : ""}` },
              { key: "category", header: "Category", cell: (p: any) => categoryMap.get(p.categoryId) || "—" },
              { key: "brand", header: "Brand", cell: (p: any) => brandMap.get(p.brandId || "") || "—" },
              { key: "type", header: "Type", cell: (p: any) => <Badge>{PRODUCT_TYPE_LABEL[p.productType] || p.productType}</Badge> },
              { key: "price", header: "Selling price", cell: (p: any) => <span>{p.sellingPrice ? `₱${Number(p.sellingPrice).toFixed(2)}` : "—"}</span> },
            ]}
            actions={(p: any) => (
              <div className="flex flex-wrap gap-2">
                {canUpdate && (
                  <LinkButton href={`${base}/dashboard/inventory/products/${p.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
                )}
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
}
