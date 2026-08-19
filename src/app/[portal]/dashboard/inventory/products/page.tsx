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

  if (!session.tenantId) {
    return (
      <div>
        <PageHeader title="Products" description="Item master data by type, category, and brand." />
        <Card>
          <p className="text-sm text-red-600">Inventory requires a tenant workspace. Contact your administrator.</p>
        </Card>
      </div>
    );
  }

  const base = portal.base;
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
  });

  const categories = await prisma.category.findMany({ where: { tenantId: session.tenantId! }, orderBy: { name: "asc" } });
  const categoryMap = new Map(categories.map((c: any) => [c.id, c.name as string]));

  const brandRows = await prisma.brand.findMany({ where: { tenantId: session.tenantId! }, select: { id: true, name: true } });
  const brandMap = new Map(brandRows.map((b: any) => [b.id, b.name as string]));

  const canCreate = can(keys, "inventory.product.create");
  const canUpdate = can(keys, "inventory.product.update");

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
            rows={products}
            href={(p) => `${base}/dashboard/inventory/products/${p.id}/edit`}
            primary={(p) => `${p.name} ${p.sku ? `(${p.sku})` : ""}`}
            secondary={(p) => brandMap.get(p.brandId || "") || categoryMap.get(p.categoryId) || ""}
            meta={(p) => [
              { label: "Type", value: PRODUCT_TYPE_LABEL[p.productType] || p.productType },
              { label: "Price", value: p.sellingPrice ? `₱${Number(p.sellingPrice).toFixed(2)}` : "—" },
            ]}
            columns={[
              { key: "name", header: "Product", cell: (p) => `${p.name}${p.sku ? ` (${p.sku})` : ""}` },
              { key: "category", header: "Category", cell: (p) => categoryMap.get(p.categoryId) || "—" },
              { key: "brand", header: "Brand", cell: (p) => brandMap.get(p.brandId || "") || "—" },
              { key: "type", header: "Type", cell: (p) => <Badge>{PRODUCT_TYPE_LABEL[p.productType] || p.productType}</Badge> },
              { key: "price", header: "Selling price", cell: (p) => <span>{p.sellingPrice ? `₱${Number(p.sellingPrice).toFixed(2)}` : "—"}</span> },
            ]}
            actions={(p) => (
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
