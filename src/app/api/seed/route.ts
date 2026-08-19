import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { PERMISSION_CATALOGUE, TENANT_ADMIN_KEYS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function checkSecret(req: NextRequest) {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const token = req.headers.get("x-seed-token");
  return token === expected;
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const start = Date.now();
  let permissionsSeeded = 0;
  let rolesUpdated = 0;

  try {
    for (const p of PERMISSION_CATALOGUE) {
      await prisma.permission.upsert({
        where: { key: p.key },
        update: { module: p.module, description: p.description },
        create: p,
      });
      permissionsSeeded++;
    }

    const allPerms = await prisma.permission.findMany();

    const adminRole = await prisma.role.upsert({
      where: { id: "super-admin-role" },
      update: {},
      create: {
        id: "super-admin-role",
        tenantId: null,
        name: "Super Administrator",
        description: "Full platform access",
        isSystem: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    await prisma.rolePermission.createMany({
      data: allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    rolesUpdated++;

    const tenantAdminRole = await prisma.role.upsert({
      where: { id: "tenant-admin-role" },
      update: {},
      create: {
        id: "tenant-admin-role",
        tenantId: null,
        name: "Tenant Admin",
        description: "Full access within a tenant workspace",
        isSystem: true,
      },
    });

    const tenantAdminPerms = await prisma.permission.findMany({
      where: { key: { in: TENANT_ADMIN_KEYS } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: tenantAdminRole.id } });
    await prisma.rolePermission.createMany({
      data: tenantAdminPerms.map((p) => ({ roleId: tenantAdminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    rolesUpdated++;

    return Response.json({
      ok: true,
      permissionsSeeded,
      rolesUpdated,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    console.error("/api/seed error", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "seed_failed" },
      { status: 500 }
    );
  }
}
