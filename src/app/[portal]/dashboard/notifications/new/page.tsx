import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, Field, Select } from "@/components/form";
import { createNotificationAction } from "../actions";

export const dynamic = "force-dynamic";

const TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"] as const;

export default async function NewNotificationPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) redirect("/admin/login");
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);

  const isAdmin = session.tenantId === null;
  const tenants = isAdmin
    ? await prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  const recipients = !isAdmin
    ? await prisma.user.findMany({ where: { tenantId: session.tenantId }, select: { id: true, firstName: true, lastName: true, email: true } })
    : [];

  const canCreate = isAdmin || can(await getPermissionKeys(session.sub, session.isSuperAdmin), "role.create");
  if (!canCreate) redirect(`${portal.base}/dashboard/notifications`);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New notification" description="Send a message to your workspace." breadcrumb={{ href: `${portal.base}/dashboard/notifications`, label: "Notifications" }} />
      <Card>
        <ActionForm
          action={createNotificationAction}
          portal={portal.slug}
          submitLabel="Send notification"
          cancelHref={`${portal.base}/dashboard/notifications`}
          redirectOnSuccess={`${portal.base}/dashboard/notifications`}
        >
          <Field label="Title" name="title" required placeholder="System maintenance" />
          <Field label="Message" name="message" required placeholder="Scheduled downtime on Sunday 02:00." span />
          <Select label="Type" name="type" options={TYPES as unknown as string[]} defaultValue="INFO" required />
          {isAdmin ? (
            <div>
              <label htmlFor="target" className="mb-1.5 block text-sm font-medium">Send to <span className="text-red-500">*</span></label>
              <select id="target" name="target" required defaultValue="platform" className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]">
                <option value="platform">Platform / Admin (all admins)</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ) : recipients.length > 0 ? (
            <div>
              <label htmlFor="recipientId" className="mb-1.5 block text-sm font-medium">Recipient</label>
              <select id="recipientId" name="recipientId" defaultValue="" className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]">
                <option value="">Everyone in my workspace</option>
                {recipients.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
              </select>
            </div>
          ) : (
            <input type="hidden" name="target" value="self" />
          )}
        </ActionForm>
      </Card>
    </div>
  );
}
