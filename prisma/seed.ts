import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PERMISSION_CATALOGUE } from "../src/lib/permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ADMIN_EMAIL = "jerome.adriano.us@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@JRA2026!";

async function main() {
  // 1. Permission catalogue (platform-owned)
  for (const p of PERMISSION_CATALOGUE) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }
  console.log(`✓ ${PERMISSION_CATALOGUE.length} permissions`);

  // 2. Platform Super Administrator role (tenantId = null)
  const allPerms = await prisma.permission.findMany();
  const existingRole = await prisma.role.findFirst({
    where: { tenantId: null, name: "Super Administrator" },
  });
  const adminRole =
    existingRole ??
    (await prisma.role.create({
      data: {
        tenantId: null,
        name: "Super Administrator",
        description: "Full platform access",
        isSystem: true,
      },
    }));

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  console.log("✓ Super Administrator role");

  // 3. Seeded platform admin — tenantId NULL, admin portal only
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL, tenantId: null } });

  const admin = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, isSuperAdmin: true, status: "ACTIVE" },
      })
    : await prisma.user.create({
        data: {
          tenantId: null,
          firstName: "Jerome",
          lastName: "Adriano",
          email: ADMIN_EMAIL,
          passwordHash,
          isSuperAdmin: true,
          status: "ACTIVE",
        },
      });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`✓ Admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("  tenant_id = NULL -> can ONLY sign in at admin.erp.jra.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
