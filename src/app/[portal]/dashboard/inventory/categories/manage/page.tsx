import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteCategoryAction } from "../../../actions";

export const dynamic = "force-dynamic";

type Cat = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  createdAt: Date;
  productCount: number;
};

export default async function ManageCategoriesPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.product.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const tenantId = session.tenantId!;

  const raw = await prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  } as any);

  const all: Cat[] = raw.map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isActive: c.isActive,
    parentId: c.parentId,
    createdAt: c.createdAt,
    productCount: c._count?.products ?? 0,
  }));

  const mains = all.filter((c) => !c.parentId);
  const byParent = new Map<string, Cat[]>();
  for (const c of all.filter((x) => x.parentId)) {
    const arr = byParent.get(c.parentId!) ?? [];
    arr.push(c);
    byParent.set(c.parentId!, arr);
  }

  const canCreate = can(keys, "inventory.category.create");
  const canUpdate = can(keys, "inventory.category.update");
  const canDelete = can(keys, "inventory.category.delete");

  return (
    <div>
      <PageHeader
        title="Manage categories"
        description="Organize products into main categories and nested subcategories."
        breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }}
        action={
          canCreate ? (
            <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New category</LinkButton>
          ) : undefined
        }
      />

      {mains.length === 0 && all.length === 0 ? (
        <Card>
          <EmptyState
            title="No categories yet"
            description="Create a main category first, then add subcategories beneath it."
            action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New category</LinkButton> : undefined}
          />
        </Card>
      ) : mains.length === 0 && all.length > 0 ? (
        <Card>
          <EmptyState
            title="All categories are nested"
            description="These categories already have a parent. Create a main category (no parent) to organize them."
            action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New main category</LinkButton> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {mains.map((m) => {
            const subs = byParent.get(m.id) ?? [];
            return (
              <Card key={m.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <LinkButton
                        variant="ghost"
                        href={`${base}/dashboard/inventory/categories/${m.id}`}
                        className="!px-0 !text-base !font-semibold"
                      >
                        {m.name}
                      </LinkButton>
                      <Badge tone={m.isActive ? "success" : "neutral"}>{m.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge tone="brand">{m.productCount} products</Badge>
                    </div>
                    {m.description && (
                      <p className="mt-1 text-sm text-[var(--muted)]">{m.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canCreate && (
                      <LinkButton
                        variant="secondary"
                        size="sm"
                        href={`${base}/dashboard/inventory/categories/new?parentId=${m.id}`}
                      >
                        + Subcategory
                      </LinkButton>
                    )}
                    {canUpdate && (
                      <LinkButton
                        variant="secondary"
                        size="sm"
                        href={`${base}/dashboard/inventory/categories/${m.id}/edit`}
                      >
                        Edit
                      </LinkButton>
                    )}
                    {canDelete && (
                      <DeleteButton
                        action={deleteCategoryAction}
                        portal={portal.slug}
                        id={m.id}
                        confirmText={`Delete main category "${m.name}" and unlink its subcategories?`}
                      />
                    )}
                  </div>
                </div>

                {subs.length > 0 ? (
                  <ul className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subs.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-[var(--background)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <LinkButton
                            variant="ghost"
                            href={`${base}/dashboard/inventory/categories/${s.id}`}
                            className="!px-0 !text-sm !font-medium"
                          >
                            {s.name}
                          </LinkButton>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                            <span className="text-[11px] text-[var(--muted)]">{s.productCount} products</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {canUpdate && (
                            <LinkButton
                              variant="ghost"
                              size="sm"
                              href={`${base}/dashboard/inventory/categories/${s.id}/edit`}
                              className="!px-2"
                            >
                              Edit
                            </LinkButton>
                          )}
                          {canDelete && (
                            <DeleteButton
                              action={deleteCategoryAction}
                              portal={portal.slug}
                              id={s.id}
                              confirmText={`Delete subcategory "${s.name}"?`}
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 border-t pt-4 text-sm text-[var(--muted)]">No subcategories yet.</p>
                )}
              </Card>
            );
          })}

          {all.filter((c) => !mains.some((m) => m.id === c.id) && !c.parentId).length === 0 && null}
        </div>
      )}
    </div>
  );
}
