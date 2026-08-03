import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routing is path-based: /admin/... and /[tenant]/...
 * The portal segment is resolved in the route itself (it needs DB access to
 * validate the tenant), so the proxy only exposes the pathname to server
 * components that need it.
 */
export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-pathname", request.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
