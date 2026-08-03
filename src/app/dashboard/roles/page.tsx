import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, getHostContext } from "@/lib/auth";
import { PLATFORM_ONLY_KEYS } from "@/lib/permissions";
import { saveRoleAction, deleteRoleAction } from "../actions";
import { ActionForm, Field, Card, CheckboxGroup } from "../ui";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "role.view")) redirect("/dashboard");
  const { isAdminPortal } = await getHostContext();

  const roles = await prisma.role.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
  });

  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Roles &amp; Permissions</h1>
        <p className="text-sm text-slate-500">
          {isAdminPortal
            ? "Platform administrators define the permission catalogue and platform roles."
            : "Combine permissions into roles for your workspace. Platform-only permissions are not selectable."}
        </p>
      </div>

      <Card title="Roles">
        <div className="space-y-3">
          {roles.length === 0 && <p className="text-sm text-slate-500">No roles yet.</p>}
          {roles.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-900">
                    {r.name}
                    {r.isSystem && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">SYSTEM</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">{r.description ?? "—"} · {r._count.users} user(s)</div>
                </div>
                {can(keys, "role.delete") && !r.isSystem && (
                  <form action={deleteRoleAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-[11px] text-red-600 hover:underline">Delete</button>
                  </form>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.permissions.map((p) => (
                  <span key={p.permissionId} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                    {p.permission.key}
                  </span>
                ))}
                {r.permissions.length === 0 && <span className="text-[11px] text-slate-400">no permissions</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {can(keys, "role.create") && (
        <Card title="Create role">
          <ActionForm action={saveRoleAction} submitLabel="Create role">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role name" name="name" required placeholder="Branch Manager" />
              <Field label="Description" name="description" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">Permissions</p>
              <CheckboxGroup
                name="permissionIds"
                items={permissions.map((p) => ({
                  id: p.id,
                  label: p.key,
                  sub: `${p.module}${p.description ? " · " + p.description : ""}`,
                  disabled: !isAdminPortal && PLATFORM_ONLY_KEYS.has(p.key),
                }))}
              />
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
