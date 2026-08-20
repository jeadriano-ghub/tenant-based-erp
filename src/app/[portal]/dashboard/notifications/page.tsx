import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, EmptyState, LinkButton, Button } from "@/components/ui";
import { markReadFormAction, markAllReadFormAction, deleteNotificationFormAction } from "./actions";
import { humanTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const tone: Record<string, string> = {
  INFO: "bg-blue-500/15 text-blue-300",
  SUCCESS: "bg-emerald-500/15 text-emerald-300",
  WARNING: "bg-amber-500/15 text-amber-300",
  ERROR: "bg-red-500/15 text-red-300",
};

export default async function NotificationsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) redirect("/admin/login");
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const notes = await prisma.notification.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const canCreate = session.isSuperAdmin || can(await getPermissionKeys(session.sub, session.isSuperAdmin), "role.create");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="Messages scoped to your workspace only."
        action={
          <div className="flex gap-2">
            <form action={markAllReadFormAction}>
              <input type="hidden" name="portal" value={portal.slug} />
              <Button type="submit" variant="secondary" size="sm">Mark all read</Button>
            </form>
            {canCreate && <LinkButton href={`${portal.base}/dashboard/notifications/new`}>New notification</LinkButton>}
          </div>
        }
      />

      <Card>
        {notes.length === 0 ? (
          <EmptyState title="No notifications" description="You're all caught up." />
        ) : (
          <ul className="divide-y">
            {notes.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-4 py-4 ${n.read ? "opacity-60" : ""}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[var(--brand)]"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge className={tone[n.type] ?? tone.INFO}>{n.type}</Badge>
                    {n.recipientId && <Badge>direct</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{n.message}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{humanTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {!n.read && (
                    <form action={markReadFormAction}>
                      <input type="hidden" name="portal" value={portal.slug} />
                      <input type="hidden" name="id" value={n.id} />
                      <Button type="submit" variant="ghost" size="sm">Mark read</Button>
                    </form>
                  )}
                  <form action={deleteNotificationFormAction}>
                    <input type="hidden" name="portal" value={portal.slug} />
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">Delete</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
