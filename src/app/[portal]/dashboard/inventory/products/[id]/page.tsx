import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const product = await prisma.product.findUnique({ where: { id } } as any);
  if (!product || product.tenantId !== session.tenantId) notFound();

  const category = product.categoryId ? await prisma.category.findUnique({ where: { id: product.categoryId } } as any) : null;
  const brand = product.brandId ? await prisma.brand.findUnique({ where: { id: product.brandId } } as any) : null;

  const canEdit = can(keys, "inventory.product.update");

  return (
    <div className="space-y-5">
      <PageHeader
        title={product.name}
        description={`${product.sku} · ${product.productType}`}
        breadcrumb={{ href: `${base}/dashboard/inventory/products`, label: "Products" }}
        action={
          <div className="flex gap-2">
            {canEdit && <LinkButton href={`${base}/dashboard/inventory/products/${product.id}/edit`}>Edit</LinkButton>}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Name", value: product.name },
            { label: "SKU", value: product.sku },
            { label: "Type", value: <Badge>{product.productType}</Badge> },
            { label: "Category", value: category?.name || "—" },
            { label: "Brand", value: brand?.name || "—" },
            { label: "Selling price", value: product.sellingPrice ? `₱${Number(product.sellingPrice).toFixed(2)}` : "—" },
            { label: "Status", value: <Badge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Active" : "Inactive"}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}
