import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterInput, FilterSelect } from "@/components/filter-bar";
import { deleteCategoryAction } from "../../../actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Cat = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  createdAt: Date;
  productCount: number;
};

export default async function ManageCategoriesPage({
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
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const sizeRaw = Number(typeof sp.size === "string" ? sp.size : "") || 0;
  const pageSize = [10, 15, 25, 50, 100].includes(sizeRaw) ? sizeRaw : PAGE_SIZE;

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/categories/manage`;
  const tenantId = session.tenantId!;

  const where: any = { tenantId };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (status === "active") where.isActive = true;
  else if (status === "inactive") where.isActive = false;

  // Mains (filtered + paginated)
  const [rawMains, total] = await Promise.all([
    prisma.category.findMany({
      where: { ...where, parentId: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    } as any),
    prisma.category.count({ where: { ...where, parentId: null } }),
  ]);

  // When searching, also include mains that have a matching subcategory, so the
  // subcategory list view shows all subcategories (matched or not) under them.
  let mainIds = (rawMains as any[]).map((c: any) => c.id);
  if (q) {
    const extra = await prisma.category.findMany({
      where: { tenantId, parentId: { not: null }, name: { contains: q, mode: "insensitive" } },
      select: { parentId: true },
    } as any);
    const extras = (extra as any[]).map((c: any) => c.parentId).filter(Boolean);
    mainIds = Array.from(new Set([...mainIds, ...extras]));
  }

  // Fetch ALL subcategories of the visible mains (unfiltered by sub name/status)
  // so every main card lists all of its subcategories.
  const rawSubs = mainIds.length
    ? await prisma.category.findMany({
        where: { tenantId, parentId: { in: mainIds } },
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
      } as any)
    : [];

  const mains: Cat[] = (rawMains as any[]).map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isActive: c.isActive,
    parentId: c.parentId,
    createdAt: c.createdAt,
    productCount: c._count?.products ?? 0,
  }));
  const subs: Cat[] = (rawSubs as any[]).map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isActive: c.isActive,
    parentId: c.parentId,
    createdAt: c.createdAt,
    productCount: c._count?.products ?? 0,
  }));

  const byParent = new Map<string, Cat[]>();
  for (const s of subs) {
    if (!s.parentId) continue;
    const arr = byParent.get(s.parentId) ?? [];
    arr.push(s);
    byParent.set(s.parentId, arr);
  }

  const canCreate = can(keys, "inventory.category.create");
  const canUpdate = can(keys, "inventory.category.update");
  const canDelete = can(keys, "inventory.category.delete");

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize products into main categories and nested subcategories."
        breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }}
        action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New category</LinkButton> : undefined}
      />

      <FilterBar basePath={basePath}>
        <FilterInput name="q" defaultValue={q} placeholder="Search category" />
        <FilterSelect name="status" defaultValue={status} placeholder="All statuses" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      </FilterBar>

      {mains.length === 0 && subs.length === 0 ? (
        <Card>
          <EmptyState
            title="No categories yet"
            description="Create a main category first, then add subcategories beneath it."
            action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/categories/new`}>New category</LinkButton> : undefined}
          />
        </Card>
      ) : mains.length === 0 && subs.length > 0 ? (
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
                      <LinkButton variant="ghost" href={`${base}/dashboard/inventory/categories/${m.id}`} className="!px-0 !text-base !font-semibold">
                        {m.name}
                      </LinkButton>
                      <Badge tone={m.isActive ? "success" : "neutral"}>{m.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge tone="brand">{m.productCount} products</Badge>
                    </div>
                    {m.description && <p className="mt-1 text-sm text-[var(--muted)]">{m.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canCreate && (
                      <LinkButton variant="secondary" size="sm" href={`${base}/dashboard/inventory/categories/new?parentId=${m.id}`}>
                        + Subcategory
                      </LinkButton>
                    )}
                    {canUpdate && (
                      <LinkButton variant="secondary" size="sm" href={`${base}/dashboard/inventory/categories/${m.id}/edit`}>
                        Edit
                      </LinkButton>
                    )}
                    {canDelete && (
                      <DeleteButton action={deleteCategoryAction} portal={portal.slug} id={m.id} confirmText={`Delete main category "${m.name}" and unlink its subcategories?`} />
                    )}
                  </div>
                </div>

                {subs.length > 0 ? (
                  <ul className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border bg-[var(--background)] px-3 py-2">
                        <div className="min-w-0">
                          <LinkButton variant="ghost" href={`${base}/dashboard/inventory/categories/${s.id}`} className="!px-0 !text-sm !font-medium">
                            {s.name}
                          </LinkButton>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                            <span className="text-[11px] text-[var(--muted)]">{s.productCount} products</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {canUpdate && (
                            <LinkButton variant="ghost" size="sm" href={`${base}/dashboard/inventory/categories/${s.id}/edit`} className="!px-2">
                              Edit
                            </LinkButton>
                          )}
                          {canDelete && (
                            <DeleteButton action={deleteCategoryAction} portal={portal.slug} id={s.id} confirmText={`Delete subcategory "${s.name}"?`} />
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
        </div>
      )}
      <Pagination searchParams={sp} page={page} pageSize={pageSize} total={total} basePath={basePath} />
    </div>
  );
}
