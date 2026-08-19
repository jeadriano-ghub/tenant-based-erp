import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  SUBMITTED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

export default async function QuotationDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.quotation.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!quotation || quotation.tenantId !== session.tenantId) notFound();

  const canUpdate = can(keys, "inventory.quotation.update");

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Quotation ${quotation.referenceNo || `Q ${quotation.id}`}`}
        description={quotation.customerName}
        breadcrumb={{ href: `${base}/dashboard/inventory/quotations`, label: "Quotations" }}
        action={
          <div className="flex gap-2">
            {canUpdate && <LinkButton href={`${base}/dashboard/inventory/quotations/${quotation.id}/edit`}>Edit</LinkButton>}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Reference", value: quotation.referenceNo || `Q ${quotation.id}` },
            { label: "Customer", value: quotation.customerName },
            { label: "Email", value: quotation.customerEmail || "—" },
            { label: "Contact", value: quotation.contactNo || "—" },
            { label: "Expiry", value: quotation.expiryDate ? new Date(quotation.expiryDate).toLocaleDateString() : "—" },
            { label: "Status", value: <Badge tone={STATUS_TONE[quotation.status] ?? "neutral"}>{quotation.status}</Badge> },
          ]}
        />
      </Card>

      <Card title="Items">
        {quotation.items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No items.</p>
        ) : (
          <div className="space-y-2">
            {quotation.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{item.product?.name || item.productId}</div>
                  <div className="text-xs text-[var(--muted)]">Qty: {item.quantity} · Unit price: ₱{Number(item.unitPrice).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
