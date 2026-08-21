import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterInput, FilterSelect } from "@/components/filter-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function SuppliersPage({
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
  if (!can(keys, "inventory.supplier.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const sizeRaw = Number(typeof sp.size === "string" ? sp.size : "") || 0;
  const pageSize = [10, 15, 25, 50, 100].includes(sizeRaw) ? sizeRaw : PAGE_SIZE;

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/suppliers`;
  const canCreate = can(keys, "inventory.supplier.create");
  const canUpdate = can(keys, "inventory.supplier.update");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { contactPerson: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.supplier.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendor records for purchasing."
        action={canCreate ? <LinkButton href={`${basePath}/new`}>New supplier</LinkButton> : undefined}
      />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search name, contact, email" />
          <FilterSelect name="status" defaultValue={status} placeholder="All statuses" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No suppliers found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New supplier</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={suppliers}
            href={(s) => `${basePath}/${s.id}`}
            primary={(s) => s.name}
            secondary={(s) => s.contactPerson || ""}
            meta={(s) => [{ label: "Status", value: <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge> }]}
            columns={[
              { key: "name", header: "Supplier", cell: (s) => s.name },
              { key: "contact", header: "Contact person", cell: (s) => s.contactPerson || "—" },
              { key: "email", header: "Email", cell: (s) => s.email || "—" },
              { key: "phone", header: "Contact no", cell: (s) => s.contactNo || "—" },
              { key: "status", header: "Status", cell: (s) => <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge> },
            ]}
            actions={(s) => (
              <div className="flex flex-wrap gap-2">
                {canUpdate && <LinkButton href={`${basePath}/${s.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>}
              </div>
            )}
          />
        )}
        <Pagination searchParams={sp} page={page} pageSize={pageSize} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
