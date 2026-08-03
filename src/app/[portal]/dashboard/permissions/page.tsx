import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PermissionsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "permission.view")) redirect(`${portal.base}/dashboard`);
  // Tenant users never see the platform permission catalogue.
  if (!portal.isAdminPortal) notFound();
  const isAdminPortal = portal.isAdminPortal;

  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const canManage = isAdminPortal && can(keys, "permission.manage");

  return (
    <div>
      <PageHeader
        title="Permissions"
        description={
          canManage
            ? "The platform-owned permission catalogue. Tenants combine these into roles."
            : "Read-only catalogue. Combine these into roles under Roles."
        }
        action={canManage ? <LinkButton href={`${portal.base}/dashboard/permissions/new`}>New permission</LinkButton> : undefined}
      />

      <div className="space-y-5">
        {Object.entries(grouped).map(([module, items]) => (
          <Card key={module} title={module}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <code className="text-xs font-medium">{p.key}</code>
                  <p className="mt-1 text-xs text-[var(--muted)]">{p.description ?? "—"}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
