# JRA ERP — Multi-Tenant Platform

Subdomain-based multi-tenant ERP foundation built with Next.js 16 (App Router),
Prisma + PostgreSQL, and JWT session auth.

## Tenancy model

| Portal | Host | Who signs in |
|---|---|---|
| Platform admin | `admin.erp.jra.com` | Users with `tenant_id = NULL` |
| Tenant workspace | `[tenant].erp.jra.com` | Users belonging to that tenant |

A platform admin (`tenant_id IS NULL`) **cannot** sign in on a tenant subdomain, and a
tenant user cannot sign in on the admin portal. This is enforced in `src/lib/auth.ts`
(`requireSession`) and in the login action, which scopes the user lookup by `tenantId`.

### Permission rules
- **Admins add permissions** — the `Permission` catalogue is platform-owned. `permission.manage` is admin-only.
- **Tenants combine permissions using roles** — tenants create `Role` records and attach existing permissions. Platform-only keys (`permission.manage`, `tenant.create`, `tenant.delete`) are blocked server-side.
- Users created by an admin get `tenant_id = NULL`; users created inside a tenant workspace get that tenant's id.

## Modules
- **Login** — per-portal, tenant-branded (logo + name)
- **Tenant Management** — name, logo, subdomain, type, contact person/email/no, company name, industry, TIN, business registration no, full address, subscription start/end, billing cycle, payment method, status
- **Manage User** — first name, last name, email, password (standard rules)
- **Roles & Permissions** — role builder over the permission catalogue
- **Branch / Warehouse** — locations; users are connected to them

### Password rules
Min 10 characters, at least one uppercase, one lowercase, one number and one special character.

### Subdomain rules
3–63 chars, lowercase `a-z`, `0-9` and hyphens; no leading/trailing hyphen, no `--`,
not all-numeric, and not a reserved word (`admin`, `www`, `api`, …).

## Setup

```bash
npm install
cp .env.example .env      # set DATABASE_URL + AUTH_SECRET
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Seeded admin: `jerome.adriano.us@gmail.com` (password from `SEED_ADMIN_PASSWORD`, default `Admin@JRA2026!`).

### Local subdomain testing
`*.localhost` works in Chrome/Safari without hosts edits:
- Admin: http://admin.localhost:3000 (or http://localhost:3000)
- Tenant: http://acme.localhost:3000

## Deployment (Vercel)
Set env vars `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_ROOT_DOMAIN`.
Add `erp.jra.com` and wildcard `*.erp.jra.com` as domains on the project.
