import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ADMIN_SLUG } from "./tenant";

const COOKIE = "jra_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-32c"
);

export type SessionPayload = {
  sub: string;
  email: string;
  tenantId: string | null;
  tenantSlug: string | null; // null for platform admins
  isSuperAdmin: boolean;
  name: string;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export type Portal =
  | { isAdminPortal: true; slug: "admin"; tenant: null; base: "/admin" }
  | {
      isAdminPortal: false;
      slug: string;
      tenant: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
        status: string;
        subscriptionEnd: string | null;
        blocked: boolean;
        blockReason: "inactive" | "expired" | null;
      };
      base: string;
    };

/**
 * Resolves the portal from the first URL segment.
 * Returns null when the segment is not "admin" and no tenant matches — the
 * caller is expected to render notFound().
 *
 * A tenant is considered blocked (and its entire workspace 404s) when its
 * status is not ACTIVE, or its subscription has expired (subscriptionEnd in the
 * past). The block reason is surfaced so the 404 screen can explain why.
 */
export async function resolvePortal(slug: string): Promise<Portal | null> {
  const value = (slug ?? "").toLowerCase();

  if (value === ADMIN_SLUG) {
    return { isAdminPortal: true, slug: "admin", tenant: null, base: "/admin" };
  }

  const tenant = await prisma.tenant.findUnique({ where: { subdomain: value } });
  if (!tenant) return null;

  const now = Date.now();
  const expired =
    tenant.subscriptionEnd != null && new Date(tenant.subscriptionEnd).getTime() < now;
  const inactive = tenant.status !== "ACTIVE";
  const blocked = inactive || expired;
  const blockReason: "inactive" | "expired" | null = inactive
    ? "inactive"
    : expired
      ? "expired"
      : null;

  return {
    isAdminPortal: false,
    slug: tenant.subdomain,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.subdomain,
      logoUrl: tenant.logoUrl,
      status: tenant.status,
      subscriptionEnd: tenant.subscriptionEnd ? tenant.subscriptionEnd.toISOString() : null,
      blocked,
      blockReason,
    },
    base: `/${tenant.subdomain}`,
  };
}

/**
 * Enforces that the signed-in user belongs to the portal being accessed.
 * - /admin       -> only users with tenantId === null
 * - /[tenant]    -> only users whose tenantId matches that tenant
 */
export async function requireSession(portal: Portal) {
  const session = await getSession();
  if (!session) return { session: null as null, error: "UNAUTHENTICATED" as const };

  const belongs = portal.isAdminPortal
    ? session.tenantId === null
    : session.tenantId === portal.tenant.id;
  if (!belongs) return { session: null, error: "WRONG_PORTAL" as const };
  return { session, error: null };
}

export async function getPermissionKeys(userId: string, isSuperAdmin: boolean): Promise<string[]> {
  if (isSuperAdmin) return ["*"];
  const rows = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  const keys = new Set<string>();
  for (const r of rows) for (const rp of r.role.permissions) keys.add(rp.permission.key);
  return [...keys];
}

export function can(keys: string[], key: string) {
  return keys.includes("*") || keys.includes(key);
}
