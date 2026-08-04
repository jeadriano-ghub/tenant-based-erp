import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { buildSummary } from "@/lib/audit";

export const dynamic = "force-dynamic";

const actionTone: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  CREATE: "success",
  UPDATE: "brand",
  DELETE: "danger",
};

export default async function AuditLogPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) redirect("/admin/login");
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  // Tenant-scoped: only this tenant's history. Admin sees platform-only.
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { firstName: true, lastName: true, email: true } } },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Record changes in this workspace (who, what, before & after)." />
      <Card>
        {logs.length === 0 ? (
          <EmptyState title="No audit entries yet" description="Changes to records will appear here." />
        ) : (
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
