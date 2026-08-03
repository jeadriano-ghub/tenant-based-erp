"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createSession, destroySession, verifyPassword, resolvePortal } from "@/lib/auth";

export type LoginState = { error?: string };

/**
 * Login is portal-scoped: the portal slug travels with the form so the action
 * knows whether this is the admin portal or a specific tenant workspace.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const slug = String(formData.get("portal") ?? "").trim().toLowerCase();
  const portal = await resolvePortal(slug);
  if (!portal) return { error: "Unknown workspace." };

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, password } = parsed.data;

  let tenantId: string | null = null;
  if (!portal.isAdminPortal) {
    if (portal.tenant.status !== "ACTIVE") {
      return { error: `This workspace is ${portal.tenant.status.toLowerCase()}. Contact your administrator.` };
    }
    tenantId = portal.tenant.id;
  }

  // Platform admins (tenantId null) can ONLY sign in on /admin, and tenant
  // users only inside their own workspace — the tenantId filter enforces both.
  const user = await prisma.user.findFirst({ where: { email, tenantId } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  if (user.status !== "ACTIVE") {
    return { error: "Your account is not active. Contact your administrator." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: portal.isAdminPortal ? null : portal.tenant.slug,
    isSuperAdmin: user.isSuperAdmin,
    name: `${user.firstName} ${user.lastName}`,
  });

  redirect(`${portal.base}/dashboard`);
}

export async function logoutAction(formData: FormData) {
  const slug = String(formData.get("portal") ?? "admin");
  await destroySession();
  redirect(`/${slug}/login`);
}
