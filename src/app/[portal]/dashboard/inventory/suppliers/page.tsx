import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ResponsiveList } from "@/components/responsive-list";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.supplier.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const suppliers: any[] = await prisma.supplier.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  const canCreate = can(keys, "inventory.supplier.create");
  const canUpdate = can(keys, "inventory.supplier.update");

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendor records for purchasing."
        action={
          canCreate ? <LinkButton href={`${base}/dashboard/inventory/suppliers/new`}>New supplier</LinkButton> : undefined
        }
      />
      <Card>
        {suppliers.length === 0 ? (
          <EmptyState
            title="No suppliers yet"
            action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/suppliers/new`}>New supplier</LinkButton> : undefined}
          />
        ) : (
          <ResponsiveList
            rows={suppliers}
            href={(s) => `${base}/dashboard/inventory/suppliers/${s.id}`}
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
                {canUpdate && (
                  <LinkButton href={`${base}/dashboard/inventory/suppliers/${s.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
                )}
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
}
