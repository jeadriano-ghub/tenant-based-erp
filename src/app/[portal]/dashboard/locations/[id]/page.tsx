import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteLocationAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  if (session.tenantId === null) redirect(`${portal.base}/dashboard`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "location.view")) redirect(`${portal.base}/dashboard`);

  const loc = await prisma.location.findUnique({
    where: { id },
    include: { users: { include: { user: true } } },
  });
  if (!loc || loc.tenantId !== session.tenantId) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${loc.code} — ${loc.name}`}
        breadcrumb={{ href: `${portal.base}/dashboard/locations`, label: "Branch / Warehouse" }}
        action={
          <div className="flex gap-2">
            {can(keys, "location.update") && <LinkButton href={`${portal.base}/dashboard/locations/${loc.id}/edit`}>Edit</LinkButton>}
            {can(keys, "location.delete") && (
              <DeleteButton action={deleteLocationAction} portal={portal.slug} id={loc.id} confirmText={`Delete ${loc.code}?`} />
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={loc.type === "WAREHOUSE" ? "brand" : "neutral"}>{loc.type}</Badge>
        <Badge tone={loc.isActive ? "success" : "danger"}>{loc.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
        <Badge>{loc.users.length} users</Badge>
      </div>

      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Code", value: <code className="text-xs">{loc.code}</code> },
            { label: "Name", value: loc.name },
            { label: "Type", value: loc.type },
            { label: "Address", value: loc.address },
            { label: "City", value: loc.city },
            { label: "Contact no.", value: loc.contactNo },
          ]}
        />
      </Card>

      <Card title="Assigned users">
        {loc.users.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No users assigned to this location.</p>
        ) : (
          <ul className="divide-y">
            {loc.users.map((ul) => (
              <li key={ul.userId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <a href={`${portal.base}/dashboard/users/${ul.userId}`} className="text-sm hover:text-[var(--brand)] hover:underline">
                  {ul.user.firstName} {ul.user.lastName}
                  <span className="ml-2 text-xs text-[var(--muted)]">{ul.user.email}</span>
                </a>
                {ul.isPrimary && <Badge tone="success">Primary</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
