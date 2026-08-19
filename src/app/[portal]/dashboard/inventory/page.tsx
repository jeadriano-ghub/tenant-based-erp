import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InventoryDashboardPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const base = portal.base;
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  const can = (key: string) => keys.includes("*") || keys.includes(key);

  const inventoryKeys = [
    "inventory.product.view","inventory.product.create","inventory.product.update","inventory.product.delete",
    "inventory.category.view","inventory.category.create","inventory.category.update","inventory.category.delete",
    "inventory.brand.view","inventory.brand.create","inventory.brand.update","inventory.brand.delete",
    "inventory.supplier.view","inventory.supplier.create","inventory.supplier.update","inventory.supplier.delete",
    "inventory.purchase_order.view","inventory.purchase_order.create","inventory.purchase_order.update","inventory.purchase_order.delete",
    "inventory.sales_order.view","inventory.sales_order.create","inventory.sales_order.update","inventory.sales_order.delete",
    "inventory.quotation.view","inventory.quotation.create","inventory.quotation.update","inventory.quotation.delete",
    "inventory.stock_movement.view","inventory.stock_movement.create",
    "inventory.pos.view","inventory.pos.create",
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Products, suppliers, purchasing, and sales in one place."
        action={
          <div className="flex flex-wrap gap-2">
            {can("inventory.product.create") && (
              <LinkButton href={`${base}/dashboard/inventory/products/new`}>New product</LinkButton>
            )}
            {can("inventory.supplier.create") && (
              <LinkButton href={`${base}/dashboard/inventory/suppliers/new`} variant="secondary">New supplier</LinkButton>
            )}
            {can("inventory.purchase_order.create") && (
              <LinkButton href={`${base}/dashboard/inventory/purchase-orders/new`} variant="secondary">New purchase order</LinkButton>
            )}
            {can("inventory.sales_order.create") && (
              <LinkButton href={`${base}/dashboard/inventory/sales-orders/new`} variant="secondary">New sales order</LinkButton>
            )}
            {can("inventory.quotation.create") && (
              <LinkButton href={`${base}/dashboard/inventory/quotations/new`} variant="secondary">New quotation</LinkButton>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Debug" description="Current session effective permission keys">
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[var(--muted)]">User:</span> <span className="font-mono">{session.name} · {session.email}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Super admin:</span> <span className="font-mono">{String(session.isSuperAdmin)}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Inventory keys ({keys.filter(k => k.startsWith("inventory.")).length}/{inventoryKeys.length}):</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {inventoryKeys.map((k) => {
                  const has = keys.includes("*") || keys.includes(k);
                  return (
                    <span key={k} className={`rounded px-1.5 py-1 font-mono ${has ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {has ? "✓" : "✗"} {k}
                    </span>
                  );
                })}
              </div>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[var(--muted)]">All effective keys</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg border p-2 font-mono text-[10px] leading-relaxed">{keys.join("\n")}</pre>
            </details>
          </div>
        </Card>
        <Card title="Products" description="Catalog, types, stock levels, and pricing.">
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`${base}/dashboard/inventory/products`} variant="secondary">Products</LinkButton>
            {can("inventory.category.create") && (
              <LinkButton href={`${base}/dashboard/inventory/categories/new`} variant="secondary">New category</LinkButton>
            )}
            {can("inventory.brand.create") && (
              <LinkButton href={`${base}/dashboard/inventory/brands/new`} variant="secondary">New brand</LinkButton>
            )}
          </div>
        </Card>
        <Card title="Purchasing" description="Suppliers, POs, stock in, and receipts.">
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`${base}/dashboard/inventory/suppliers`} variant="secondary">Suppliers</LinkButton>
            <LinkButton href={`${base}/dashboard/inventory/purchase-orders`} variant="secondary">Purchase orders</LinkButton>
            <LinkButton href={`${base}/dashboard/inventory/stock-movements`} variant="secondary">Stock movements</LinkButton>
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
