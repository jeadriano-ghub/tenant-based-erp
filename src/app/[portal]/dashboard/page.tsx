import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, resolvePortal } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import { ROOT_DOMAIN } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-[var(--muted)]">{label}</div>
    </>
  );
  return href ? (
    <a href={href} className="rounded-[var(--radius)] border bg-[var(--surface)] p-5 shadow-sm transition-all hover:border-[var(--brand)] hover:shadow-md">
      {body}
    </a>
  ) : (
    <div className="rounded-[var(--radius)] border bg-[var(--surface)] p-5 shadow-sm">{body}</div>
  );
}

export default async function OverviewPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();

  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const base = portal.base;

  const stats = portal.isAdminPortal
    ? [
        { label: "Tenants", value: await prisma.tenant.count(), href: `${base}/dashboard/tenants` },
        { label: "Active tenants", value: await prisma.tenant.count({ where: { status: "ACTIVE" } }) },
        { label: "Platform admins", value: await prisma.user.count({ where: { tenantId: null } }), href: `${base}/dashboard/users` },
        { label: "Permissions", value: await prisma.permission.count(), href: `${base}/dashboard/permissions` },
      ]
    : [
        { label: "Users", value: await prisma.user.count({ where: { tenantId: session.tenantId } }), href: `${base}/dashboard/users` },
        { label: "Roles", value: await prisma.role.count({ where: { tenantId: session.tenantId } }), href: `${base}/dashboard/roles` },
        {
          label: "Branches / Warehouses",
          value: await prisma.location.count({ where: { tenantId: session.tenantId ?? undefined } }),
          href: `${base}/dashboard/locations`,
        },
      ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {portal.isAdminPortal ? "Platform Overview" : `${portal.tenant.name} Overview`}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Welcome back, {session.name}.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {portal.isAdminPortal && (
        <div className="mt-6 rounded-[var(--radius)] border bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold">Get started</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create a tenant to provision a workspace at{" "}
            <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs">{ROOT_DOMAIN}/[tenant]</code>.
          </p>
          <div className="mt-4">
            <LinkButton href={`${base}/dashboard/tenants/new`}>New tenant</LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}
