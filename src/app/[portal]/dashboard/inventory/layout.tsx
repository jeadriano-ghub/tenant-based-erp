import { redirect, notFound } from "next/navigation";
import { requireSession, resolvePortal } from "@/lib/auth";

export default async function InventoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (portal.isAdminPortal) redirect(`${portal.base}/dashboard`);

  return <>{children}</>;
}
