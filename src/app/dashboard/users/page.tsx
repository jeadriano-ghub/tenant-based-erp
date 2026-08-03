import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, getHostContext } from "@/lib/auth";
import { saveUserAction, deleteUserAction } from "../actions";
import { ActionForm, Field, Card, CheckboxGroup } from "../ui";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "user.view")) redirect("/dashboard");
  const { isAdminPortal } = await getHostContext();

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      roles: { include: { role: true } },
      locations: { include: { location: true } },
    },
  });

  const roles = await prisma.role.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
  });
  const locations = session.tenantId
    ? await prisma.location.findMany({ where: { tenantId: session.tenantId }, orderBy: { code: "asc" } })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Manage Users</h1>
        <p className="text-sm text-slate-500">
          {isAdminPortal
            ? "Users created here are platform administrators — their tenant_id is NULL and they can only sign in at admin.erp.jra.com."
            : "Users belong to this tenant workspace and are connected to a branch or warehouse."}
        </p>
      </div>

      <Card title="Users">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Name</th><th>Email</th><th>Roles</th>
                <th>Branch / Warehouse</th><th>Status</th><th>Last login</th><th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                    {u.isSuperAdmin && (
                      <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">SUPER</span>
                    )}
                  </td>
                  <td className="text-slate-600">{u.email}</td>
                  <td className="text-slate-600">{u.roles.map((r) => r.role.name).join(", ") || "—"}</td>
                  <td className="text-slate-600">{u.locations.map((l) => l.location.code).join(", ") || "—"}</td>
                  <td className="text-slate-600">{u.status}</td>
                  <td className="text-[11px] text-slate-500">
                    {u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "never"}
                  </td>
                  <td>
                    {can(keys, "user.delete") && u.id !== session.sub && (
                      <form action={deleteUserAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button className="text-[11px] text-red-600 hover:underline">Delete</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {can(keys, "user.create") && (
        <Card title="Create user">
          <ActionForm action={saveUserAction} submitLabel="Create user">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" name="firstName" required />
              <Field label="Last name" name="lastName" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required
                hint="Min 10 chars with uppercase, lowercase, number and special character." />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">Roles</p>
              <CheckboxGroup name="roleIds" items={roles.map((r) => ({ id: r.id, label: r.name, sub: r.description ?? undefined }))} />
            </div>
            {!isAdminPortal && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">Branch / Warehouse</p>
                <CheckboxGroup name="locationIds"
                  items={locations.map((l) => ({ id: l.id, label: `${l.code} — ${l.name}`, sub: l.type }))} />
              </div>
            )}
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
