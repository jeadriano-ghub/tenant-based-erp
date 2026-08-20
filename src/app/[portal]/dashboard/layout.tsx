import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, resolvePortal } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { AppShell } from "@/components/app-shell";
import { logoutAction } from "../../(auth)/actions";
import { NotificationBell } from "./notifications/bell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();

  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  const has = (k: string) => keys.includes("*") || keys.includes(k);
  const hasSomeInventory = (ks: string[]) =>
    ks.includes("*") ||
    ks.some((k) => k.startsWith("inventory."));
  const base = portal.base;

  const nav = [
    { href: `${base}/dashboard`, label: "Overview", show: true },
    { href: `${base}/dashboard/tenants`, label: "Tenant Management", show: portal.isAdminPortal && has("tenant.view") },
    { href: `${base}/dashboard/users`, label: "Manage Users", show: has("user.view") },
    { href: `${base}/dashboard/roles`, label: "Roles", show: has("role.view") },
    { href: `${base}/dashboard/permissions`, label: "Permissions", show: portal.isAdminPortal && has("permission.view") },
    { href: `${base}/dashboard/locations`, label: "Branch / Warehouse", show: !portal.isAdminPortal && has("location.view") },
  ]
    .filter((n) => n.show)
    .map(({ href, label }) => ({ href, label } as { href: string; label: string }));

  const inventoryGroup: { label: string; items: { label: string; items: { href: string; label: string; show?: boolean }[] }[] } | null =
    !portal.isAdminPortal && hasSomeInventory(keys)
      ? {
          label: "Inventory",
          items: [
            {
              label: "Master Data",
              items: [
                { href: `${base}/dashboard/inventory/categories/manage`, label: "Categories", show: has("inventory.product.view") },
                { href: `${base}/dashboard/inventory/suppliers`, label: "Suppliers", show: has("inventory.supplier.view") },
                { href: `${base}/dashboard/inventory/brands`, label: "Brands", show: has("inventory.brand.view") },
              ],
            },
            {
              label: "Operations",
              items: [
                { href: `${base}/dashboard/inventory/products`, label: "Products", show: has("inventory.product.view") },
                { href: `${base}/dashboard/inventory/purchase-orders`, label: "Purchase Orders", show: has("inventory.purchase_order.view") },
                { href: `${base}/dashboard/inventory/quotations`, label: "Quotations", show: has("inventory.quotation.view") },
                { href: `${base}/dashboard/inventory/sales-orders`, label: "Sales Orders", show: has("inventory.sales_order.view") },
                { href: `${base}/dashboard/inventory/pos`, label: "POS", show: has("inventory.pos.view") },
                { href: `${base}/dashboard/inventory/stock-movements`, label: "Stock Movements", show: has("inventory.stock_movement.view") },
              ],
            },
          ],
        }
      : null;

  const filteredInventory = inventoryGroup
    ? { ...inventoryGroup, items: inventoryGroup.items.map((g) => ({ ...g, items: g.items.filter((i) => i.show !== false) })) }
    : null;

  const finalNav = filteredInventory
    ? [...nav, filteredInventory, { href: `${base}/dashboard/audit`, label: "Audit Log" }]
    : [...nav, { href: `${base}/dashboard/audit`, label: "Audit Log" }];

  const signOut = (
    <form action={logoutAction}>
      <input type="hidden" name="portal" value={portal.slug} />
      <button className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600">
        Sign out
      </button>
    </form>
  );

  return (
    <AppShell
      nav={finalNav as any}
      title={portal.isAdminPortal ? "JRA ERP" : portal.tenant.name}
      subtitle={`${ROOT_DOMAIN}/${portal.slug}`}
      logoUrl={portal.isAdminPortal ? null : portal.tenant.logoUrl}
      defaultLogoUrl={process.env.NEXT_PUBLIC_DEFAULT_LOGO || null}
      bell={<NotificationBell portal={portal.slug} />}
      user={{ name: session.name, email: session.email, isSuperAdmin: session.isSuperAdmin }}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
