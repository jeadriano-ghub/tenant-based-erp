import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteRoleAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "role.view")) redirect(`${portal.base}/dashboard`);

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      users: { include: { user: true } },
    },
  });
  if (!role || role.tenantId !== session.tenantId) notFound();

  const byModule = role.permissions.reduce<Record<string, string[]>>((acc, rp) => {
    (acc[rp.permission.module] ??= []).push(rp.permission.key);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title={role.name}
        description={role.description ?? undefined}
        breadcrumb={{ href: `${portal.base}/dashboard/roles`, label: "Roles" }}
        action={
          <div className="flex gap-2">
            {can(keys, "role.update") && <LinkButton href={`${portal.base}/dashboard/roles/${role.id}/edit`}>Edit</LinkButton>}
            {can(keys, "role.delete") && !role.isSystem && (
              <DeleteButton action={deleteRoleAction} portal={portal.slug} id={role.id} confirmText={`Delete role "${role.name}"?`} />
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {role.isSystem && <Badge>SYSTEM ROLE</Badge>}
        <Badge tone="brand">{role.permissions.length} permissions</Badge>
        <Badge>{role.users.length} users</Badge>
      </div>

      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Name", value: role.name },
            { label: "Description", value: role.description },
            { label: "Scope", value: role.tenantId ? "Tenant role" : "Platform role" },
            { label: "Created", value: role.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>

      <Card title="Permissions">
        {role.permissions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No permissions attached.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byModule).map(([mod, list]) => (
              <div key={mod}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{mod}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((k) => (
                    <code key={k} className="rounded bg-[var(--background)] px-2 py-1 text-xs">{k}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Assigned users">
        {role.users.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No users have this role.</p>
        ) : (
          <ul className="divide-y">
            {role.users.map((ur) => (
              <li key={ur.userId} className="py-2 first:pt-0 last:pb-0">
                <a href={`${portal.base}/dashboard/users/${ur.userId}`} className="text-sm hover:text-[var(--brand)] hover:underline">
                  {ur.user.firstName} {ur.user.lastName}
                  <span className="ml-2 text-xs text-[var(--muted)]">{ur.user.email}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
