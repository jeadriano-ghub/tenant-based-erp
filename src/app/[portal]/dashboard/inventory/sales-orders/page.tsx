import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterInput, FilterSelect } from "@/components/filter-bar";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  CONFIRMED: "warning",
  FULFILLED: "success",
  CANCELLED: "danger",
};

const PAGE_SIZE = 15;

export default async function SalesOrdersPage({
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
  if (!can(keys, "inventory.sales_order.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/sales-orders`;
  const canCreate = can(keys, "inventory.sales_order.create");
  const canUpdate = can(keys, "inventory.sales_order.update");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.OR = [{ referenceNo: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }];
  if (status) where.status = status;

  const [salesOrders, total] = await Promise.all([
    prisma.salesOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.salesOrder.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales orders"
        description="Order fulfillment and stock-out flow."
        action={canCreate ? <LinkButton href={`${basePath}/new`}>New sales order</LinkButton> : undefined}
      />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search reference or customer" />
          <FilterSelect name="status" defaultValue={status} placeholder="All statuses" options={Object.keys(STATUS_TONE).map((s) => ({ value: s, label: s }))} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No sales orders found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New sales order</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={salesOrders}
            href={(so) => `${basePath}/${so.id}`}
            primary={(so) => so.referenceNo || `SO ${so.id}`}
            secondary={(so) => so.customerName}
            meta={(so) => [{ label: "Status", value: <Badge tone={STATUS_TONE[so.status] ?? "neutral"}>{so.status}</Badge> }]}
            columns={[
              { key: "ref", header: "Reference", cell: (so) => so.referenceNo || `SO ${so.id}` },
              { key: "customer", header: "Customer", cell: (so) => so.customerName },
              { key: "status", header: "Status", cell: (so) => <Badge tone={STATUS_TONE[so.status] ?? "neutral"}>{so.status}</Badge> },
            ]}
            actions={(so) => (
              <div className="flex flex-wrap gap-2">
                {canUpdate && <LinkButton href={`${basePath}/${so.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>}
              </div>
            )}
          />
        )}
        <Pagination searchParams={sp} page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
