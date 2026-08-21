import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterInput, FilterSelect } from "@/components/filter-bar";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  STOCK_IN: "success",
  STOCK_OUT: "danger",
  ADJUSTMENT: "warning",
};

const PAGE_SIZE = 15;

export default async function StockMovementsPage({
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
  if (!can(keys, "inventory.stock_movement.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const sizeRaw = Number(typeof sp.size === "string" ? sp.size : "") || 0;
  const pageSize = [10, 15, 25, 50, 100].includes(sizeRaw) ? sizeRaw : PAGE_SIZE;

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/stock-movements`;
  const canCreate = can(keys, "inventory.stock_movement.create");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.reference = { contains: q, mode: "insensitive" };
  if (type) where.type = type;

  const stockMovements: any[] = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  } as any);
  const total = (await prisma.stockMovement.count({ where } as any)) as number;
  const productIds = Array.from(new Set(stockMovements.map((sm: any) => sm.productId).filter(Boolean)));
  const products: any[] = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } } as any)
    : [];
  const productMap = new Map(products.map((p: any) => [p.id, p.name]));

  return (
    <div>
      <PageHeader
        title="Stock movements"
        description="Stock in, stock out, and manual adjustments."
        action={canCreate ? <LinkButton href={`${basePath}/new`}>New stock movement</LinkButton> : undefined}
      />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search reference" />
          <FilterSelect name="type" defaultValue={type} placeholder="All types" options={Object.keys(TYPE_TONE).map((t) => ({ value: t, label: t }))} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No stock movements found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New stock movement</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={stockMovements}
            href={(sm) => `${basePath}/${sm.id}`}
            primary={(sm) => productMap.get(sm.productId) || sm.productId}
            secondary={(sm) => sm.reference || `SM ${sm.id}`}
            meta={(sm) => [
              { label: "Type", value: <Badge tone={TYPE_TONE[sm.type] ?? "neutral"}>{sm.type}</Badge> },
              { label: "Qty", value: `${sm.quantity}` },
              { label: "Date", value: sm.createdAt ? new Date(sm.createdAt).toLocaleDateString() : "—" },
            ]}
            columns={[
              { key: "ref", header: "Reference", cell: (sm) => sm.reference || `SM ${sm.id}` },
              { key: "product", header: "Product", cell: (sm) => productMap.get(sm.productId) || sm.productId },
              { key: "type", header: "Type", cell: (sm) => <Badge tone={TYPE_TONE[sm.type] ?? "neutral"}>{sm.type}</Badge> },
              { key: "qty", header: "Quantity", cell: (sm) => sm.quantity },
              { key: "date", header: "Date", cell: (sm) => sm.createdAt ? new Date(sm.createdAt).toLocaleDateString() : "—" },
            ]}
            actions={(sm) => (
              <div className="flex flex-wrap gap-2">
                {canCreate && <LinkButton href={`${basePath}/${sm.id}`} variant="secondary" size="sm">View</LinkButton>}
              </div>
            )}
          />
        )}
        <Pagination searchParams={sp} page={page} pageSize={pageSize} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
