export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "erp.jra.com";
export const ADMIN_SUBDOMAIN = "admin";

/** Subdomain rules: 3-63 chars, a-z 0-9 and hyphens, no leading/trailing hyphen,
 *  no double hyphen, not purely numeric, not reserved. */
const RESERVED = new Set([
  "admin", "www", "api", "app", "mail", "ftp", "root", "system", "static",
  "assets", "cdn", "support", "help", "billing", "status", "docs", "blog",
  "dev", "staging", "test", "vercel", "erp",
]);

export function validateSubdomain(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = (input ?? "").trim().toLowerCase();
  if (value.length < 3 || value.length > 63) return { ok: false, error: "Subdomain must be 3-63 characters." };
  if (!/^[a-z0-9-]+$/.test(value)) return { ok: false, error: "Only lowercase letters, numbers and hyphens are allowed." };
  if (value.startsWith("-") || value.endsWith("-")) return { ok: false, error: "Subdomain cannot start or end with a hyphen." };
  if (value.includes("--")) return { ok: false, error: "Subdomain cannot contain consecutive hyphens." };
  if (/^\d+$/.test(value)) return { ok: false, error: "Subdomain cannot be all numbers." };
  if (RESERVED.has(value)) return { ok: false, error: `"${value}" is a reserved subdomain.` };
  return { ok: true, value };
}

/** Extracts the tenant subdomain from a Host header. Returns null for the apex/localhost. */
export function subdomainFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();

  // Local development: acme.localhost:3000
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    return sub || null;
  }
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    return sub.split(".").pop() || null;
  }

  // Vercel preview domains (*.vercel.app) -> treat as apex/admin
  const parts = hostname.split(".");
  if (parts.length > 2 && !hostname.endsWith("vercel.app")) return parts[0];
  return null;
}

export function isAdminHost(host: string | null): boolean {
  const sub = subdomainFromHost(host);
  return sub === null || sub === ADMIN_SUBDOMAIN;
}
