import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { requireSession, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { buildSummary } from "@/lib/audit";
import { AuditFilters } from "./filters";

export const dynamic = "force-dynamic";

const actionTone: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  CREATE: "success",
  UPDATE: "brand",
  DELETE: "danger",
};

const ENTITIES = ["Tenant", "User", "Role", "Location", "Permission"];

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ portal: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) redirect("/admin/login");
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const sp = await searchParams;
  const p = {
    entity: sp.entity ?? "",
    action: sp.action ?? "",
    actor: sp.actor ?? "",
    from: sp.from ?? "",
    to: sp.to ?? "",
    q: sp.q ?? "",
  };

  // Build the tenant-scoped query (portal isolation preserved).
  const where: Prisma.AuditLogWhereInput = { tenantId: session.tenantId };
  if (p.entity) where.entity = p.entity;
  if (p.action) where.action = p.action as Prisma.AuditLogWhereInput["action"];
  if (p.actor) where.actorId = p.actor;
  if (p.from || p.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (p.from) { const d = new Date(p.from + "T00:00:00"); if (!isNaN(d.getTime())) createdAt.gte = d; }
    if (p.to) { const d = new Date(p.to + "T23:59:59.999"); if (!isNaN(d.getTime())) createdAt.lte = d; }
    if (Object.keys(createdAt).length) where.createdAt = createdAt;
  }
  if (p.q) {
    const q = p.q;
    where.OR = [
      { entity: { contains: q, mode: "insensitive" } },
      { entityName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [logs, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const actorOptions = actors.map((a) => ({
    id: a.id,
    label: `${a.firstName} ${a.lastName}`.trim() || a.email,
  }));

  const active = [p.entity && `Entity: ${p.entity}`, p.action && `Action: ${p.action}`, p.actor && `Actor: ${actorOptions.find((a) => a.id === p.actor)?.label ?? p.actor}`, p.from && `From: ${p.from}`, p.to && `To: ${p.to}`, p.q && `Search: "${p.q}"`].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Record changes in this workspace (who, what, before & after)." />

      <Card>
        <AuditFilters
          entities={ENTITIES}
          actions={["CREATE", "UPDATE", "DELETE"]}
          actors={actorOptions}
          params={p}
        />
        {active.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {active.map((chip) => (
              <span key={chip} className="rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs font-medium text-[var(--brand)]">
                {chip}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card>
        {logs.length === 0 ? (
          <EmptyState title="No matching audit entries" description="Try adjusting or clearing the filters." />
        ) : (
          <p className="mb-3 text-xs text-[var(--muted)]">{logs.length} entr{logs.length === 1 ? "y" : "ies"}</p>
        )}
        {logs.length > 0 && (
          <ul className="divide-y">
            {logs.map((l) => {
              const summary = buildSummary({
                tenantId: l.tenantId,
                actorId: l.actorId,
                entity: l.entity as "Tenant" | "User" | "Role" | "Location" | "Permission",
                entityId: l.entityId,
                entityName: l.entityName,
                action: l.action,
                before: (l.before ?? null) as Record<string, unknown> | null,
                after: (l.after ?? null) as Record<string, unknown> | null,
              });
              return (
                <li key={l.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={actionTone[l.action] ?? "neutral"}>{l.action}</Badge>
                    <span className="font-medium">{l.entity}{l.entityName ? `: ${l.entityName}` : ""}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    by {l.actor ? `${l.actor.firstName} ${l.actor.lastName}`.trim() || l.actor.email : "system"}
                  </p>
                  {l.action === "UPDATE" && summary && (
                    <p className="mt-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/5 px-3 py-2 text-xs">
                      {summary}
                    </p>
                  )}
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border bg-[var(--background)] p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Before</p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{l.before ? JSON.stringify(l.before, null, 2) : "—"}</pre>
                    </div>
                    <div className="rounded-lg border bg-[var(--background)] p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">After</p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{l.after ? JSON.stringify(l.after, null, 2) : "—"}</pre>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
