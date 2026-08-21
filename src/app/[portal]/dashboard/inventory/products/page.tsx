import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterInput, FilterSelect } from "@/components/filter-bar";

export const dynamic = "force-dynamic";

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  SERIALIZED: "Serialized",
  NON_SERIALIZED: "Non-serialized",
  BARCODE: "Barcode",
};

const PAGE_SIZE = 15;

export default async function ProductsPage({
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
  if (!can(keys, "inventory.product.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const categoryId = typeof sp.category === "string" ? sp.category : "";
  const brandId = typeof sp.brand === "string" ? sp.brand : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const sizeRaw = Number(typeof sp.size === "string" ? sp.size : "") || 0;
  const pageSize = [10, 15, 25, 50, 100].includes(sizeRaw) ? sizeRaw : PAGE_SIZE;

  const base = portal.base;
  const canCreate = can(keys, "inventory.product.create");
  const canUpdate = can(keys, "inventory.product.update");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }];
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (type) where.productType = type;

  const [products, total, categories, brands] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { tenantId: session.tenantId! }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ where: { tenantId: session.tenantId! }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const categoryMap = new Map(categories.map((c: any) => [c.id, c.name as string]));
  const brandMap = new Map(brands.map((b: any) => [b.id, b.name as string]));
  const basePath = `${base}/dashboard/inventory/products`;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Item master data by type, category, and brand."
        action={canCreate ? <LinkButton href={`${basePath}/new`}>New product</LinkButton> : undefined}
      />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search name or SKU" />
          <FilterSelect name="category" defaultValue={categoryId} placeholder="All categories" options={categories.map((c: any) => ({ value: c.id, label: c.name }))} />
          <FilterSelect name="brand" defaultValue={brandId} placeholder="All brands" options={brands.map((b: any) => ({ value: b.id, label: b.name }))} />
          <FilterSelect name="type" defaultValue={type} placeholder="All types" options={Object.entries(PRODUCT_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No products found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New product</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={products as any}
            href={(p: any) => `${basePath}/${p.id}/edit`}
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
                {canUpdate && <LinkButton href={`${basePath}/${p.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>}
              </div>
            )}
          />
        )}
        <Pagination searchParams={sp} page={page} pageSize={pageSize} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
