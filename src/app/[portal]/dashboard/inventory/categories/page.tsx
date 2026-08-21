import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The Categories list lives at /inventory/categories/manage (card view with nested
// subcategories + actions). This route is a thin entry point that redirects there so
// every link (sidebar, breadcrumbs) lands on the same UI.
export default async function CategoriesPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.view")) redirect(`${portal.base}/dashboard/inventory`);
  redirect(`${portal.base}/dashboard/inventory/categories/manage`);
}
