import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function LocationsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId === null) redirect(`${portal.base}/dashboard`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "location.view")) redirect(`${portal.base}/dashboard`);

  const locations = await prisma.location.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { code: "asc" },
    include: { _count: { select: { users: true } } },
  });

  const canCreate = can(keys, "location.create");

  return (
    <div>
      <PageHeader
        title="Branch / Warehouse"
        description="Users are connected to one or more of these locations."
        action={canCreate ? <LinkButton href={`${portal.base}/dashboard/locations/new`}>New location</LinkButton> : undefined}
      />

      <Card>
        {locations.length === 0 ? (
          <EmptyState
            title="No branches or warehouses yet"
            action={canCreate ? <LinkButton href={`${portal.base}/dashboard/locations/new`}>New location</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={locations}
            href={(l) => `${portal.base}/dashboard/locations/${l.id}`}
            primary={(l) => `${l.code} — ${l.name}`}
            secondary={(l) => [l.address, l.city].filter(Boolean).join(", ") || "—"}
            meta={(l) => [
              { label: "Type", value: <Badge tone={l.type === "WAREHOUSE" ? "brand" : "neutral"}>{l.type}</Badge> },
              { label: "Users", value: l._count.users },
            ]}
            columns={[
              { key: "code", header: "Code", cell: (l) => <code className="text-xs">{l.code}</code> },
              { key: "name", header: "Name", cell: (l) => l.name },
              { key: "type", header: "Type", cell: (l) => <Badge tone={l.type === "WAREHOUSE" ? "brand" : "neutral"}>{l.type}</Badge> },
              { key: "city", header: "City", hideBelow: "lg", cell: (l) => <span className="text-[var(--muted)]">{l.city ?? "—"}</span> },
              { key: "users", header: "Users", cell: (l) => l._count.users },
            ]}
            actions={(l) => <LinkButton href={`${portal.base}/dashboard/locations/${l.id}`} variant="secondary" size="sm">View</LinkButton>}
          />
        )}
      </Card>
    </div>
  );
}
