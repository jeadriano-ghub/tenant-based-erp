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
  SUBMITTED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

const PAGE_SIZE = 15;

export default async function PurchaseOrdersPage({
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
  if (!can(keys, "inventory.purchase_order.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const supplierId = typeof sp.supplier === "string" ? sp.supplier : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/purchase-orders`;
  const canCreate = can(keys, "inventory.purchase_order.create");
  const canUpdate = can(keys, "inventory.purchase_order.update");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.referenceNo = { contains: q, mode: "insensitive" };
  if (supplierId) where.supplierId = supplierId;
  if (status) where.status = status;

  const [purchaseOrders, total, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.purchaseOrder.count({ where }),
    prisma.supplier.findMany({ where: { tenantId: session.tenantId! }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const supplierMap = new Map(suppliers.map((s: any) => [s.id, s.name]));

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="Procurement orders and receipt status."
        action={canCreate ? <LinkButton href={`${basePath}/new`}>New purchase order</LinkButton> : undefined}
      />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search reference" />
          <FilterSelect name="supplier" defaultValue={supplierId} placeholder="All suppliers" options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))} />
          <FilterSelect name="status" defaultValue={status} placeholder="All statuses" options={Object.keys(STATUS_TONE).map((s) => ({ value: s, label: s }))} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No purchase orders found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New purchase order</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={purchaseOrders}
            href={(po) => `${basePath}/${po.id}`}
            primary={(po) => po.referenceNo || `PO ${po.id}`}
            secondary={(po) => supplierMap.get(po.supplierId) || ""}
            meta={(po) => [{ label: "Status", value: <Badge tone={STATUS_TONE[po.status] ?? "neutral"}>{po.status}</Badge> }]}
            columns={[
              { key: "ref", header: "Reference", cell: (po) => po.referenceNo || `PO ${po.id}` },
              { key: "supplier", header: "Supplier", cell: (po) => supplierMap.get(po.supplierId) || "—" },
              { key: "status", header: "Status", cell: (po) => <Badge tone={STATUS_TONE[po.status] ?? "neutral"}>{po.status}</Badge> },
              { key: "expected", header: "Expected", cell: (po) => po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—" },
            ]}
            actions={(po) => (
              <div className="flex flex-wrap gap-2">
                {canUpdate && <LinkButton href={`${basePath}/${po.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>}
              </div>
            )}
          />
        )}
        <Pagination searchParams={sp} page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
