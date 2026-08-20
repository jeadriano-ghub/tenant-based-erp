import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const categories = await prisma.category.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { createdAt: "desc" },
  } as any);
  const parents = await prisma.category.findMany({ where: { tenantId: session.tenantId! }, select: { id: true, name: true } } as any);
  const parentMap = new Map(parents.map((p: any) => [p.id, p.name as string]));
  const categoriesWithParent = categories.map((c: any) => ({ ...c, parent: { name: parentMap.get(c.parentId) || null } }));

  const canCreate = can(keys, "inventory.category.create");

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Product categories and subcategories."
        action={
          <div className="flex gap-2">
            <LinkButton href={`${base}/dashboard/inventory/categories/manage`} variant="secondary">Manage</LinkButton>
            {canCreate && <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New category</LinkButton>}
          </div>
        }
      />
      <Card>
        {categories.length === 0 ? (
          <EmptyState title="No categories" action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New category</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={categoriesWithParent}
            href={(c) => `${base}/dashboard/inventory/categories/${c.id}`}
            primary={(c: any) => (c as any).name}
            secondary={(c: any) => ((c as any).parent ?? {})?.name || ""}
            meta={(c) => [{ label: "Status", value: <Badge tone={(c as any).isActive ? "success" : "neutral"}>{(c as any).isActive ? "Active" : "Inactive"}</Badge> }]}
            columns={[
              { key: "name", header: "Name", cell: (c) => (c as any).name },
              { key: "parent", header: "Parent", cell: (c) => ((c as any).parent ?? {})?.name || "—" },
              { key: "status", header: "Status", cell: (c) => <Badge tone={(c as any).isActive ? "success" : "neutral"}>{(c as any).isActive ? "Active" : "Inactive"}</Badge> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
