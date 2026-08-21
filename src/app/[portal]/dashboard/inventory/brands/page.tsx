import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";
import { Pagination } from "@/components/pagination";
import { FilterBar, FilterInput, FilterSelect } from "@/components/filter-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function BrandsPage({
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
  if (!can(keys, "inventory.brand.view")) redirect(`${portal.base}/dashboard/inventory`);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const base = portal.base;
  const basePath = `${base}/dashboard/inventory/brands`;
  const canCreate = can(keys, "inventory.brand.create");

  const where: any = { tenantId: session.tenantId! };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (status === "active") where.isActive = true;
  else if (status === "inactive") where.isActive = false;

  const [brands, total] = await Promise.all([
    prisma.brand.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.brand.count({ where }),
  ]);

  return (
    <div>
      <PageHeader title="Brands" description="Manufacturers and product brands." action={canCreate ? <LinkButton href={`${basePath}/new`}>New brand</LinkButton> : undefined} />
      <Card>
        <FilterBar basePath={basePath}>
          <FilterInput name="q" defaultValue={q} placeholder="Search brand" />
          <FilterSelect name="status" defaultValue={status} placeholder="All statuses" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        </FilterBar>
        {total === 0 ? (
          <EmptyState title="No brands found" action={canCreate ? <LinkButton href={`${basePath}/new`}>New brand</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={brands as any}
            href={(b) => `${basePath}/${b.id}`}
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
        <Pagination searchParams={sp} page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} />
      </Card>
    </div>
  );
}
