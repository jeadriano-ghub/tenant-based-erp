import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, LinkButton, EmptyState } from "@/components/ui";
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

  if (!session.tenantId) {
    return (
      <div>
        <PageHeader title="Suppliers" description="Vendor records for purchasing." />
        <Card>
          <p className="text-sm text-red-600">Inventory requires a tenant workspace. Contact your administrator.</p>
        </Card>
      </div>
    );
  }

  const base = portal.base;
  const suppliers = await prisma.supplier.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" } });
  const canCreate = can(keys, "inventory.supplier.create");

  return (
    <div>
      <PageHeader title="Suppliers" description="Vendor records for purchasing." action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/suppliers/new`}>New supplier</LinkButton> : undefined} />
      <Card>
        {suppliers.length === 0 ? (
          <EmptyState title="No suppliers" action={canCreate ? <LinkButton href={`${base}/dashboard/inventory/suppliers/new`}>New supplier</LinkButton> : undefined} />
        ) : (
          <ResponsiveList
            rows={suppliers as any}
            href={(s) => `${base}/dashboard/inventory/suppliers/${s.id}`}
            primary={(s) => (s as any).name}
            secondary={(s) => (s as any).contactPerson || ""}
            meta={(s) => [
              { label: "Email", value: (s as any).email || "—" },
              { label: "Contact", value: (s as any).contactNo || "—" },
            ]}
            columns={[
              { key: "name", header: "Supplier", cell: (s) => (s as any).name },
              { key: "contact", header: "Contact", cell: (s) => (s as any).contactPerson || "—" },
              { key: "email", header: "Email", cell: (s) => (s as any).email || "—" },
              { key: "contactNo", header: "Contact no.", cell: (s) => (s as any).contactNo || "—" },
              { key: "city", header: "City", cell: (s) => (s as any).city || "—" },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
