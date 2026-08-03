import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { saveLocationAction } from "../../../actions";
import { LocationForm } from "../../location-form";

export const dynamic = "force-dynamic";

export default async function EditLocationPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId === null) redirect(`${portal.base}/dashboard`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "location.update")) redirect(`${portal.base}/dashboard/locations/${id}`);

  const loc = await prisma.location.findUnique({ where: { id } });
  if (!loc || loc.tenantId !== session.tenantId) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${loc.code}`} breadcrumb={{ href: `${portal.base}/dashboard/locations/${loc.id}`, label: loc.name }} />
      <Card>
        <LocationForm
          action={saveLocationAction}
          portal={portal.slug}
          values={loc}
          submitLabel="Save changes"
          cancelHref={`${portal.base}/dashboard/locations/${loc.id}`}
          redirectOnSuccess={`${portal.base}/dashboard/locations/${loc.id}`}
        />
      </Card>
    </div>
  );
}
