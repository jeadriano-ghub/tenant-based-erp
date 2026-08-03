import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, getHostContext } from "@/lib/auth";
import { savePermissionAction } from "../actions";
import { ActionForm, Field, Card } from "../ui";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "permission.view")) redirect("/dashboard");
  const { isAdminPortal } = await getHostContext();

  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Permissions</h1>
        <p className="text-sm text-slate-500">
          The permission catalogue is owned by the platform. Only administrators can add permissions;
          tenants combine existing permissions into roles.
        </p>
      </div>

      <Card title="Permission catalogue">
        <div className="space-y-5">
          {Object.entries(grouped).map(([module, items]) => (
            <div key={module}>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">{module}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((p) => (
                  <div key={p.id} className="rounded-md border border-slate-200 px-3 py-2">
                    <div className="font-mono text-xs text-slate-900">{p.key}</div>
                    <div className="text-[11px] text-slate-500">{p.description ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isAdminPortal && can(keys, "permission.manage") && (
        <Card title="Add permission (platform administrators only)">
          <ActionForm action={savePermissionAction} submitLabel="Add permission">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Key" name="key" required placeholder="inventory.transfer" hint="format: module.action" />
              <Field label="Module" name="module" required placeholder="Inventory" />
              <Field label="Description" name="description" />
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
