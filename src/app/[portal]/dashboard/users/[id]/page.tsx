import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList, statusTone } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteUserAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "user.view")) redirect(`${portal.base}/dashboard`);
  const isAdminPortal = portal.isAdminPortal;

  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      locations: { include: { location: true } },
    },
  });
  // Tenant isolation: never expose users from another tenant.
  if (!u || u.tenantId !== session.tenantId) notFound();

  const permKeys = [...new Set(u.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)))].sort();

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${u.firstName} ${u.lastName}`}
        description={u.email}
        breadcrumb={{ href: `${portal.base}/dashboard/users`, label: "Manage Users" }}
        action={
          <div className="flex gap-2">
            {can(keys, "user.update") && <LinkButton href={`${portal.base}/dashboard/users/${u.id}/edit`}>Edit</LinkButton>}
            {can(keys, "user.delete") && u.id !== session.sub && (
              <DeleteButton
                action={deleteUserAction}
                portal={portal.slug}
                id={u.id}
                confirmText={`Delete ${u.firstName} ${u.lastName}? This cannot be undone.`}
              />
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(u.status)}>{u.status}</Badge>
        {u.isSuperAdmin && <Badge tone="brand">SUPER ADMIN</Badge>}
        {u.tenantId === null && <Badge>Platform admin · tenant_id NULL</Badge>}
      </div>

      <Card title="Profile">
        <DescriptionList
          items={[
            { label: "First name", value: u.firstName },
            { label: "Last name", value: u.lastName },
            { label: "Email", value: <a className="text-[var(--brand)] hover:underline" href={`mailto:${u.email}`}>{u.email}</a> },
            { label: "Status", value: <Badge tone={statusTone(u.status)}>{u.status}</Badge> },
            { label: "Last login", value: u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "Never" },
            { label: "Created", value: u.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>

      <Card title="Roles" description="Roles assigned to this user.">
        {u.roles.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No roles assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {u.roles.map((r) => (
              <Badge key={r.roleId} tone="brand">{r.role.name}</Badge>
            ))}
          </div>
        )}
      </Card>

      <Card title="Effective permissions" description="Union of all permissions granted by the roles above.">
        {u.isSuperAdmin ? (
          <p className="text-sm text-[var(--muted)]">Super administrator — full access to every permission.</p>
        ) : permKeys.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No permissions.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {permKeys.map((k) => (
              <code key={k} className="rounded bg-[var(--background)] px-2 py-1 text-xs">{k}</code>
            ))}
          </div>
        )}
      </Card>

      {!isAdminPortal && (
        <Card title="Branch / Warehouse">
          {u.locations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Not assigned to any location.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {u.locations.map((l) => (
                <Badge key={l.locationId} tone={l.isPrimary ? "success" : "neutral"}>
                  {l.location.code} — {l.location.name}{l.isPrimary ? " (primary)" : ""}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
