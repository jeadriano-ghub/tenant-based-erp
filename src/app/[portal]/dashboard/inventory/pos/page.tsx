import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import PosClient from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.pos.create") && !can(keys, "inventory.stock_movement.create")) redirect(`${portal.base}/dashboard/inventory`);

  return <PosClient portal={portal.slug} />;
}
