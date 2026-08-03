import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can } from "@/lib/auth";
import { saveLocationAction, deleteLocationAction } from "../actions";
import { ActionForm, Field, Select, Card } from "../ui";

export const dynamic = "force-dynamic";

const TYPES = ["BRANCH", "WAREHOUSE"] as const;

export default async function LocationsPage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");
  if (session.tenantId === null) redirect("/dashboard");
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "location.view")) redirect("/dashboard");

  const locations = await prisma.location.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { code: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Branch / Warehouse</h1>
        <p className="text-sm text-slate-500">Users are connected to one or more branches or warehouses.</p>
      </div>

      <Card title="Locations">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="py-2">Code</th><th>Name</th><th>Type</th><th>Address</th><th>Contact</th><th>Users</th><th /></tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-500">No branches or warehouses yet.</td></tr>
            )}
            {locations.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs text-slate-900">{l.code}</td>
                <td className="font-medium text-slate-900">{l.name}</td>
                <td className="text-slate-600">{l.type}</td>
                <td className="text-slate-600">{[l.address, l.city].filter(Boolean).join(", ") || "—"}</td>
                <td className="text-slate-600">{l.contactNo ?? "—"}</td>
                <td className="text-slate-600">{l._count.users}</td>
                <td>
                  {can(keys, "location.delete") && (
                    <form action={deleteLocationAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="text-[11px] text-red-600 hover:underline">Delete</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {can(keys, "location.create") && (
        <Card title="Add branch or warehouse">
          <ActionForm action={saveLocationAction} submitLabel="Add location">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Code" name="code" required placeholder="MNL-01" />
              <Field label="Name" name="name" required placeholder="Manila Main Branch" />
              <Select label="Type" name="type" options={TYPES} required />
              <Field label="Address" name="address" />
              <Field label="City" name="city" />
              <Field label="Contact no." name="contactNo" />
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
