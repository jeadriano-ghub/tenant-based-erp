import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "erp.jra.com";

function subdomainOf(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname.endsWith(".localhost")) return hostname.slice(0, -".localhost".length) || null;
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    return sub.split(".").pop() || null;
  }
  if (hostname.endsWith("vercel.app")) return null;
  const parts = hostname.split(".");
  return parts.length > 2 ? parts[0] : null;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const sub = subdomainOf(host);
  const isAdminPortal = sub === null || sub === "admin";

  const res = NextResponse.next();
  res.headers.set("x-portal", isAdminPortal ? "admin" : "tenant");
  res.headers.set("x-tenant-subdomain", isAdminPortal ? "" : (sub ?? ""));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
