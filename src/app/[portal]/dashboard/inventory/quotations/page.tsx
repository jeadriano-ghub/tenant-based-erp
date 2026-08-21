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
  SENT: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
};

const PAGE_SIZE = 15;

export default async function QuotationsPage({
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
  if (!can(keys, "inventory.quotation.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const sizeRaw = Number(typeof sp.size === "string" ? sp.size : "") || 0;
  const pageSize = [10, 15, 25, 50, 100].includes(sizeRaw) ? sizeRaw : PAGE_SIZE;

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/quotations`;
  const canCreate = can(keys, "inventory.quotation.create");
  const canUpdate = can(keys, "inventory.quotation.update");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.OR = [{ referenceNo: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }];
  if (status) where.status = status;

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.quotation.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Price quotes and customer estimates."
        action={canCreate ? <LinkButton href={`${basePath}/new`}>New quotation</LinkButton> : undefined}
      />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search reference or customer" />
          <FilterSelect name="status" defaultValue={status} placeholder="All statuses" options={Object.keys(STATUS_TONE).map((s) => ({ value: s, label: s }))} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No quotations found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New quotation</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={quotations}
            href={(q) => `${basePath}/${q.id}`}
            primary={(q) => q.referenceNo || `QT ${q.id}`}
            secondary={(q) => q.customerName}
            meta={(q) => [{ label: "Status", value: <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge> }]}
            columns={[
              { key: "ref", header: "Reference", cell: (q) => q.referenceNo || `QT ${q.id}` },
              { key: "customer", header: "Customer", cell: (q) => q.customerName },
              { key: "status", header: "Status", cell: (q) => <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge> },
              { key: "expiry", header: "Expiry", cell: (q) => q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : "—" },
            ]}
            actions={(q) => (
              <div className="flex flex-wrap gap-2">
                {canUpdate && <LinkButton href={`${basePath}/${q.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>}
              </div>
            )}
          />
        )}
        <Pagination searchParams={sp} page={page} pageSize={pageSize} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
