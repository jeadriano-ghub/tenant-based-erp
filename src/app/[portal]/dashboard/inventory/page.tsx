import { redirect, notFound } from "next/navigation";
import { requireSession, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const has = (keys: string[], ...perms: string[]) => perms.some((k) => keys.includes("*") || keys.includes(k));

export default async function InventoryDashboardPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = portal.isAdminPortal ? ["*"] : [];
  // In current app, permission-aware tenant views can read keys here if needed.
  const base = portal.base;

  const canView = (key: string) => portal.isAdminPortal || has(keys, key);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Products, suppliers, purchasing, and sales in one place."
        action={
          <div className="flex flex-wrap gap-2">
            {canView("inventory.product.create") && (
              <LinkButton href={`${base}/dashboard/inventory/products/new`}>New product</LinkButton>
            )}
            {canView("inventory.supplier.create") && (
              <LinkButton href={`${base}/dashboard/inventory/suppliers/new`} variant="secondary">New supplier</LinkButton>
            )}
            {canView("inventory.purchase_order.create") && (
              <LinkButton href={`${base}/dashboard/inventory/purchase-orders/new`} variant="secondary">New purchase order</LinkButton>
            )}
            {canView("inventory.sales_order.create") && (
              <LinkButton href={`${base}/dashboard/inventory/sales-orders/new`} variant="secondary">New sales order</LinkButton>
            )}
            {canView("inventory.quotation.create") && (
              <LinkButton href={`${base}/dashboard/inventory/quotations/new`} variant="secondary">New quotation</LinkButton>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Products" description="Catalog, types, stock levels, and pricing.">
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`${base}/dashboard/inventory/products`} variant="secondary">Products</LinkButton>
            {canView("inventory.category.create") && (
              <LinkButton href={`${base}/dashboard/inventory/categories/new`} variant="secondary">New category</LinkButton>
            )}
            {canView("inventory.brand.create") && (
              <LinkButton href={`${base}/dashboard/inventory/brands/new`} variant="secondary">New brand</LinkButton>
            )}
          </div>
        </Card>
        <Card title="Purchasing" description="Suppliers, POs, stock in, and receipts.">
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`${base}/dashboard/inventory/suppliers`} variant="secondary">Suppliers</LinkButton>
            <LinkButton href={`${base}/dashboard/inventory/purchase-orders`} variant="secondary">Purchase orders</LinkButton>
            <LinkButton href={`${base}/dashboard/inventory/stock-in`} variant="secondary">Stock in</LinkButton>
          </div>
        </Card>
        <Card title="Sales" description="Quotations, sales orders, POS, and stock-out flow.">
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`${base}/dashboard/inventory/quotations`} variant="secondary">Quotations</LinkButton>
            <LinkButton href={`${base}/dashboard/inventory/sales-orders`} variant="secondary">Sales orders</LinkButton>
            <LinkButton href={`${base}/dashboard/inventory/pos`} variant="secondary">POS</LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
