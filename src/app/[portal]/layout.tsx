import { notFound } from "next/navigation";
import { resolvePortal } from "@/lib/auth";

/**
 * Validates the first URL segment for every route beneath it.
 * "admin" is the platform portal; anything else must match a tenant in the
 * database, otherwise we render the 404 page.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();

  return <>{children}</>;
}
