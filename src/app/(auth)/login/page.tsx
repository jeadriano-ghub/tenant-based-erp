import { redirect } from "next/navigation";
import { getHostContext, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROOT_DOMAIN } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { isAdminPortal, subdomain } = await getHostContext();

  let title = "Platform Administration";
  let subtitle = `admin.${ROOT_DOMAIN}`;
  let logoUrl: string | null = null;
  let unknown = false;

  if (!isAdminPortal) {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain: subdomain! } })
      .catch(() => null);
    if (!tenant) {
      unknown = true;
      title = "Workspace not found";
      subtitle = `${subdomain}.${ROOT_DOMAIN}`;
    } else {
      title = tenant.name;
      subtitle = `${tenant.subdomain}.${ROOT_DOMAIN}`;
      logoUrl = tenant.logoUrl;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={title} className="mx-auto mb-3 h-12 w-12 rounded object-contain" />
          ) : (
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded bg-slate-900 text-lg font-bold text-white">
              JRA
            </div>
          )}
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        {unknown ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This workspace does not exist. Check the subdomain or contact the platform administrator.
          </p>
        ) : (
          <LoginForm portal={isAdminPortal ? "Admin" : title} />
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
          {isAdminPortal
            ? "Platform administrators only. Tenant users must sign in at their own workspace subdomain."
            : "Tenant workspace sign-in. Platform administrators cannot sign in here."}
        </p>
      </div>
    </main>
  );
}
