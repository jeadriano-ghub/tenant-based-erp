"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, resolvePortal } from "@/lib/auth";

export type NotificationState = { error?: string; success?: string };

export type NoteDTO = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

/**
 * Returns notifications visible to the current portal. Isolation is enforced by
 * filtering on tenantId: admin (tenantId === null) sees only platform
 * notifications; a tenant user sees only notifications whose tenantId matches
 * their tenant. Other tenants' notifications are never returned.
 */
export async function listNotifications(portalSlug: string): Promise<NoteDTO[]> {
  const portal = await resolvePortal(portalSlug);
  if (!portal) return [];
  const { session } = await requireSession(portal);
  if (!session) return [];

  const rows = await prisma.notification.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function unreadCount(portalSlug: string): Promise<number> {
  const portal = await resolvePortal(portalSlug);
  if (!portal) return 0;
  const { session } = await requireSession(portal);
  if (!session) return 0;
  return prisma.notification.count({ where: { tenantId: session.tenantId, read: false } });
}

async function requireOwner(fd: FormData) {
  const slug = String(fd.get("portal") ?? "").trim().toLowerCase();
  const portal = await resolvePortal(slug);
  if (!portal) return { error: "Unknown portal." as const };
  const { session } = await requireSession(portal);
  if (!session) return { error: "Not authenticated." as const };
  return { portal, session };
}

export async function markReadAction(_p: NotificationState, fd: FormData): Promise<NotificationState> {
  const ctx = await requireOwner(fd);
  if ("error" in ctx) return { error: ctx.error };
  const { portal, session } = ctx;

  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Missing notification id." };

  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.tenantId !== session.tenantId) return { error: "Not found." };

  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath(`${portal.base}/dashboard/notifications`);
  revalidatePath(`${portal.base}/dashboard`);
  return { success: "Marked as read." };
}

export async function markAllReadAction(_p: NotificationState, fd: FormData): Promise<NotificationState> {
  const ctx = await requireOwner(fd);
  if ("error" in ctx) return { error: ctx.error };
  const { portal, session } = ctx;

  await prisma.notification.updateMany({
    where: { tenantId: session.tenantId, read: false },
    data: { read: true },
  });
  revalidatePath(`${portal.base}/dashboard/notifications`);
  revalidatePath(`${portal.base}/dashboard`);
  return { success: "All marked as read." };
}

export async function deleteNotificationAction(_p: NotificationState, fd: FormData): Promise<NotificationState> {
  const ctx = await requireOwner(fd);
  if ("error" in ctx) return { error: ctx.error };
  const { portal, session } = ctx;

  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Missing notification id." };

  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.tenantId !== session.tenantId) return { error: "Not found." };

  await prisma.notification.delete({ where: { id } });
  revalidatePath(`${portal.base}/dashboard/notifications`);
  revalidatePath(`${portal.base}/dashboard`);
  return { success: "Notification removed." };
}

/* Plain (state-less) wrappers for direct <form action={...}> usage. */
export async function deleteNotificationFormAction(fd: FormData): Promise<void> {
  await deleteNotificationAction({}, fd);
}
export async function markReadFormAction(fd: FormData): Promise<void> {
  await markReadAction({}, fd);
}
export async function markAllReadFormAction(fd: FormData): Promise<void> {
  await markAllReadAction({}, fd);
}

/**
 * Creates a notification. The actor's tenant scoping is enforced:
 * - A tenant user can only create notifications for their own tenant
 *   (tenantId is forced to their tenantId, recipientId optional).
 * - The platform admin may target a specific tenant (or pass "platform" for a
 *   platform-wide notification) or a specific recipient.
 */
export async function createNotificationAction(_p: NotificationState, fd: FormData): Promise<NotificationState> {
  const ctx = await requireOwner(fd);
  if ("error" in ctx) return { error: ctx.error };
  const { portal, session } = ctx;

  const title = String(fd.get("title") ?? "").trim();
  const message = String(fd.get("message") ?? "").trim();
  const type = String(fd.get("type") ?? "INFO").toUpperCase();
  const target = String(fd.get("target") ?? "self"); // self | platform | <tenantId>

  if (!title || !message) return { error: "Title and message are required." };
  if (!["INFO", "SUCCESS", "WARNING", "ERROR"].includes(type)) return { error: "Invalid type." };

  let tenantId: string | null;
  let recipientId: string | null = null;

  if (session.tenantId === null) {
    // Platform admin
    if (target === "platform" || target === "self") {
      tenantId = null;
    } else {
      const t = await prisma.tenant.findUnique({ where: { id: target } });
      if (!t) return { error: "Unknown tenant." };
      tenantId = t.id;
    }
  } else {
    // Tenant user: always scoped to their own tenant.
    tenantId = session.tenantId;
    if (target !== "self") {
      const rid = String(fd.get("recipientId") ?? "").trim();
      if (rid) {
        const u = await prisma.user.findUnique({ where: { id: rid } });
        if (!u || u.tenantId !== session.tenantId) return { error: "Unknown recipient." };
        recipientId = u.id;
      }
    }
  }

  await prisma.notification.create({
    data: {
      tenantId,
      recipientId,
      title,
      message,
      type: type as "INFO" | "SUCCESS" | "WARNING" | "ERROR",
    },
  });
  revalidatePath(`${portal.base}/dashboard/notifications`);
  revalidatePath(`${portal.base}/dashboard`);
  return { success: "Notification sent." };
}
