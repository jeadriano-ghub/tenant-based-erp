export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "jra.com";
export const ADMIN_SLUG = "admin";

/**
 * Tenant slug rules (used as the first URL segment: jra.com/[tenant]).
 * 3-63 chars, a-z 0-9 and hyphens, no leading/trailing hyphen, no double
 * hyphen, not purely numeric, and not a reserved word.
 */
const RESERVED = new Set([
  // portal + infrastructure
  "admin", "www", "api", "app", "mail", "ftp", "root", "system", "static",
  "assets", "cdn", "support", "help", "billing", "status", "docs", "blog",
  "dev", "staging", "test", "vercel", "erp",
  // reserved because they are real or likely top-level routes
  "login", "logout", "signin", "signout", "register", "dashboard",
  "_next", "favicon.ico", "robots.txt", "sitemap.xml", "public", "new", "edit",
]);

export function validateSlug(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = (input ?? "").trim().toLowerCase();
  if (value.length < 3 || value.length > 63) return { ok: false, error: "Tenant URL must be 3-63 characters." };
  if (!/^[a-z0-9-]+$/.test(value)) return { ok: false, error: "Only lowercase letters, numbers and hyphens are allowed." };
  if (value.startsWith("-") || value.endsWith("-")) return { ok: false, error: "Tenant URL cannot start or end with a hyphen." };
  if (value.includes("--")) return { ok: false, error: "Tenant URL cannot contain consecutive hyphens." };
  if (/^\d+$/.test(value)) return { ok: false, error: "Tenant URL cannot be all numbers." };
  if (RESERVED.has(value)) return { ok: false, error: `"${value}" is a reserved word and cannot be used.` };
  return { ok: true, value };
}

/** Backwards-compatible alias — the DB column is still called `subdomain`. */
export const validateSubdomain = validateSlug;

export function isReservedSlug(value: string) {
  return RESERVED.has(value.toLowerCase());
}

/** Base path for a portal: "/admin" or "/acme". */
export function portalBase(slug: string) {
  return `/${slug}`;
}

/** Full public URL for a tenant workspace. */
export function tenantUrl(slug: string) {
  return `${ROOT_DOMAIN}/${slug}`;
}
