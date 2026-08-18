import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function BrandsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.brand.view")) redirect(`${portal.base}/dashboard`);

  const base = portal.base;
  const brands = await prisma.brand.findMany({ where: { tenantId: session.tenantId! }, orderBy: { createdAt: "desc" } });
  const canCreate = can(keys, "inventory.brand.create");

  return (
    <div>
      <PageHeader title="Brands" description="Manufacturers and product brands." action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/brands/new`}>New brand</LinkButton> : undefined} />
      <Card>
        {brands.length === 0 ? (
          <EmptyState title="No brands" action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/brands/new`}>New brand</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={brands as any}
            href={(b) => `${base}/dashboard/inventory/brands/${b.id}`}
            primary={(b) => (b as any).name}
            secondary={(b) => (b as any).website || ""}
            meta={(b) => [{ label: "Status", value: <Badge tone={(b as any).isActive ? "success" : "neutral"}>{(b as any).isActive ? "Active" : "Inactive"}</Badge> }]}
            columns={[
              { key: "name", header: "Brand", cell: (b) => (b as any).name },
              { key: "website", header: "Website", cell: (b) => (b as any).website || "—" },
              { key: "status", header: "Status", cell: (b) => <Badge tone={(b as any).isActive ? "success" : "neutral"}>{(b as any).isActive ? "Active" : "Inactive"}</Badge> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
