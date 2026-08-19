import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveSupplierAction } from "../../../actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLOCKED: "danger",
};

export default async function SupplierDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.supplier.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.tenantId !== session.tenantId) notFound();

  const canEdit = can(keys, "inventory.supplier.update");

  return (
    <div className="space-y-5">
      <PageHeader
        title={supplier.name}
        description={supplier.contactPerson ?? undefined}
        breadcrumb={{ href: `${base}/dashboard/inventory/suppliers`, label: "Suppliers" }}
        action={
          <div className="flex gap-2">
            {canEdit && <LinkButton href={`${base}/dashboard/inventory/suppliers/${supplier.id}/edit`}>Edit</LinkButton>}
          </div>
        }
      />
      <Card title="Contact">
        <DescriptionList
          items={[
            { label: "Name", value: supplier.name },
            { label: "Contact person", value: supplier.contactPerson || "—" },
            { label: "Email", value: supplier.email ? <a href={`mailto:${supplier.email}`} className="text-[var(--brand)] hover:underline">{supplier.email}</a> : "—" },
            { label: "Contact no.", value: supplier.contactNo ? <a href={`tel:${supplier.contactNo}`} className="text-[var(--brand)] hover:underline">{supplier.contactNo}</a> : "—" },
            { label: "Status", value: <Badge tone={STATUS_TONE[supplier.isActive ? "ACTIVE" : "INACTIVE"] ?? "neutral"}>{supplier.isActive ? "Active" : "Inactive"}</Badge> },
          ]}
        />
      </Card>

      {(supplier.addressLine1 || supplier.city || supplier.country) && (
        <Card title="Address">
          <DescriptionList
            items={[
              { label: "Address", value: [supplier.addressLine1, supplier.addressLine2].filter(Boolean).join(", ") || "—" },
              { label: "City", value: supplier.city || "—" },
              { label: "Postal code", value: supplier.postalCode || "—" },
              { label: "Country", value: supplier.country || "—" },
            ]}
          />
        </Card>
      )}

      {(supplier.tin || supplier.businessRegNo || supplier.notes) && (
        <Card title="Business">
          <DescriptionList
            items={[
              { label: "TIN", value: supplier.tin || "—" },
              { label: "Business reg. no.", value: supplier.businessRegNo || "—" },
              { label: "Notes", value: supplier.notes || "—" },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
