import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { saveTenantAction, deleteTenantAction } from "../actions";
import { ActionForm, Field, Select, Card } from "../ui";

export const dynamic = "force-dynamic";

const TYPES = ["CORPORATE", "SME", "ENTERPRISE", "GOVERNMENT", "NONPROFIT"] as const;
const CYCLES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;
const METHODS = ["CREDIT_CARD", "BANK_TRANSFER", "GCASH", "MAYA", "CHECK", "CASH"] as const;
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"] as const;

export default async function TenantsPage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");
  if (session.tenantId !== null) redirect("/dashboard");

  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "tenant.view")) redirect("/dashboard");

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, locations: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tenant Management</h1>
        <p className="text-sm text-slate-500">Each tenant gets its own workspace at <code>[tenant].{ROOT_DOMAIN}</code>.</p>
      </div>

      <Card title="Tenants">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Tenant</th>
                <th>Workspace URL</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Subscription</th>
                <th>Billing</th>
                <th>Status</th>
                <th>Users</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">No tenants yet.</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-2">
                    <div className="font-medium text-slate-900">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.companyName} · {t.industry}</div>
                  </td>
                  <td className="text-slate-600">{t.subdomain}.{ROOT_DOMAIN}</td>
                  <td className="text-slate-600">{t.type}</td>
                  <td className="text-slate-600">
                    <div>{t.contactPerson}</div>
                    <div className="text-[11px] text-slate-500">{t.email} · {t.contactNo}</div>
                  </td>
                  <td className="text-[11px] text-slate-600">
                    {t.subscriptionStart ? t.subscriptionStart.toISOString().slice(0, 10) : "—"} →{" "}
                    {t.subscriptionEnd ? t.subscriptionEnd.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="text-[11px] text-slate-600">{t.billingCycle}<br />{t.paymentMethod}</td>
                  <td>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{t.status}</span>
                  </td>
                  <td className="text-slate-600">{t._count.users}</td>
                  <td>
                    {can(keys, "tenant.delete") && (
                      <form action={deleteTenantAction}>
                        <input type="hidden" name="id" value={t.id} />
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

      {can(keys, "tenant.create") && (
        <Card title="Create tenant">
          <ActionForm action={saveTenantAction} submitLabel="Create tenant">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tenant name" name="name" required />
              <Field label="Subdomain" name="subdomain" required
                hint={`3-63 chars, a-z 0-9 and hyphens · [tenant].${ROOT_DOMAIN}`} placeholder="acme" />
              <Field label="Logo URL" name="logoUrl" placeholder="https://…/logo.png" />

              <Select label="Tenant type" name="type" options={TYPES} required />
              <Field label="Contact person" name="contactPerson" required />
              <Field label="Email address" name="email" type="email" required />

              <Field label="Contact no." name="contactNo" required placeholder="+63 917 000 0000" />
              <Field label="Company name" name="companyName" required />
              <Field label="Industry" name="industry" required placeholder="Retail" />

              <Field label="TIN" name="tin" placeholder="000-000-000-000" />
              <Field label="Business registration no." name="businessRegNo" />
              <Field label="Website" name="website" placeholder="https://acme.com" />

              <Field label="Address line 1" name="addressLine1" />
              <Field label="Address line 2" name="addressLine2" />
              <Field label="City" name="city" />

              <Field label="State / Province" name="stateProvince" />
              <Field label="Postal code" name="postalCode" />
              <Field label="Country" name="country" defaultValue="Philippines" />

              <Field label="Subscription start" name="subscriptionStart" type="date" />
              <Field label="Subscription end" name="subscriptionEnd" type="date" />
              <Select label="Billing cycle" name="billingCycle" options={CYCLES} required />

              <Select label="Payment method" name="paymentMethod" options={METHODS} required />
              <Select label="Status" name="status" options={STATUSES} required />
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
