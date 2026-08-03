import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { subdomainFromHost, ADMIN_SUBDOMAIN } from "./tenant";

const COOKIE = "jra_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-32c"
);

export type SessionPayload = {
  sub: string;
  email: string;
  tenantId: string | null;
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

/** Current request's tenant context derived from the Host header. */
export async function getHostContext() {
  const h = await headers();
  const host = h.get("host");
  const sub = subdomainFromHost(host);
  const isAdminPortal = sub === null || sub === ADMIN_SUBDOMAIN;
  return { host, subdomain: isAdminPortal ? null : sub, isAdminPortal };
}

/** Enforces that the session matches the portal being accessed. */
export async function requireSession() {
  const session = await getSession();
  if (!session) return { session: null as null, error: "UNAUTHENTICATED" as const };
  const { isAdminPortal, subdomain } = await getHostContext();

  if (isAdminPortal) {
    // Platform admins only (tenant_id is null)
    if (session.tenantId !== null) return { session: null, error: "WRONG_PORTAL" as const };
  } else {
    if (session.tenantId === null) return { session: null, error: "WRONG_PORTAL" as const };
    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
    if (!tenant || tenant.subdomain !== subdomain)
      return { session: null, error: "WRONG_PORTAL" as const };
  }
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
