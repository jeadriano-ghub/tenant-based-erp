import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/form";
import { convertQuotationToSalesOrderAction } from "../../../actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  DRAFT: "neutral",
  SENT: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  CONVERTED: "brand",
};

export default async function QuotationDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.quotation.view")) redirect(`${portal.base}/dashboard`);

  const base = portal.base;
  const rawQuotation: any = await (prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  }) as any);
  const quotation = rawQuotation;

  if (!quotation || quotation.tenantId !== session.tenantId) notFound();

  const canConvert = can(keys, "inventory.sales_order.create") && quotation.status !== "CONVERTED";

  return (
    <div>
      <PageHeader
        title={`Quotation ${quotation.referenceNo || `QUO ${quotation.id}`}`}
        description={quotation.customerName}
        breadcrumb={{ href: `${base}/dashboard/inventory/quotations`, label: "Quotations" }}
        action={
          canConvert ? (
            <ActionForm action={convertQuotationToSalesOrderAction} portal={slug} submitLabel="Convert to sales order" redirectOnSuccess={`${base}/dashboard/inventory/sales-orders`}>
              <input type="hidden" name="quotationId" value={quotation.id} />
            </ActionForm>
          ) : undefined
        }
      />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-[var(--muted)]">Status</p>
            <Badge tone={STATUS_TONE[quotation.status] ?? "neutral"}>{quotation.status}</Badge>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-[var(--muted)]">Customer</p>
            <p className="text-sm">{quotation.customerName}</p>
            <p className="text-xs text-[var(--muted)]">{quotation.customerEmail}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-[var(--muted)]">Contact</p>
            <p className="text-sm">{quotation.contactNo || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-[var(--muted)]">Expiry</p>
            <p className="text-sm">{quotation.expiryDate ? new Date(quotation.expiryDate).toLocaleDateString() : "—"}</p>
          </div>
          {quotation.convertedToId && (
            <div>
              <p className="text-xs font-medium uppercase text-[var(--muted)]">Sales order</p>
              <LinkButton href={`${base}/dashboard/inventory/sales-orders/${quotation.convertedToId}`} variant="secondary">View sales order</LinkButton>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Items</h3>
          {quotation.items.length === 0 ? (
            <EmptyState title="No items" />
          ) : (
            <div className="mt-2 space-y-2">
              {quotation.items.map((item: any) => (
                <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="font-medium">{item.productId}</div>
                  <div className="text-xs text-[var(--muted)]">Qty: {item.quantity} · Unit price: {item.unitPrice} · Discount: {item.discount} · Tax: {item.tax}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
