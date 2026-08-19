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
  const canCreate = can(keys, "inventory.product.create");

  // Diagnostic: add queries back one at a time to isolate crash
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Products" description="Item master data by type, category, and brand." action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/products/new`}>New product</LinkButton> : undefined} />
      <Card>
        <p className="text-sm text-[var(--muted)]">Diagnostic: products={products.length}. Queries so far: product findMany only.</p>
      </Card>
    </div>
  );
}
