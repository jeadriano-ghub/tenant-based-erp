"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import {
  createSession,
  destroySession,
  getHostContext,
  verifyPassword,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;
  const { isAdminPortal, subdomain } = await getHostContext();

  let tenantId: string | null = null;
  if (!isAdminPortal) {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain: subdomain! } });
    if (!tenant) return { error: "Unknown tenant workspace." };
    if (tenant.status !== "ACTIVE")
      return { error: `This workspace is ${tenant.status.toLowerCase()}. Contact your administrator.` };
    tenantId = tenant.id;
  }

  // Platform admins (tenantId null) can ONLY sign in on the admin portal.
  const user = await prisma.user.findFirst({
    where: { email, tenantId },
  });

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
    isSuperAdmin: user.isSuperAdmin,
    name: `${user.firstName} ${user.lastName}`,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
