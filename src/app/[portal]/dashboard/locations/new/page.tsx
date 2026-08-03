import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveLocationAction } from "../../actions";
import { LocationForm } from "../location-form";

export const dynamic = "force-dynamic";

export default async function NewLocationPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId === null) redirect(`${portal.base}/dashboard`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "location.create")) redirect(`${portal.base}/dashboard/locations`);

  return (
    <div>
      <PageHeader title="New location" breadcrumb={{ href: `${portal.base}/dashboard/locations`, label: "Branch / Warehouse" }} />
      <Card>
        <LocationForm
          action={saveLocationAction}
          portal={portal.slug}
          submitLabel="Create location"
          cancelHref={`${portal.base}/dashboard/locations`}
          redirectOnSuccess={`${portal.base}/dashboard/locations`}
        />
      </Card>
    </div>
  );
}
