"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPermissionKeys, can, hashPassword, requireSession, resolvePortal } from "@/lib/auth";
import {
  tenantSchema, userSchema, roleSchema, locationSchema, permissionSchema,
  categorySchema, brandSchema, supplierSchema, productSchema, purchaseOrderSchema, stockInSchema, salesOrderSchema, quotationSchema, stockMovementSchema,
} from "@/lib/validation";
import { PLATFORM_ONLY_KEYS, TENANT_ADMIN_ROLE, TENANT_ADMIN_KEYS } from "@/lib/permissions";
import { recordChange } from "@/lib/audit";

export type ActionState = { error?: string; success?: string; id?: string };

/**
 * Every mutating form carries a hidden `portal` field so the action can
 * re-resolve the portal server-side and re-check the session against it.
 */
async function ctx(fd: FormData) {
  const slug = String(fd.get("portal") ?? "").trim().toLowerCase();
  const portal = await resolvePortal(slug);
  if (!portal) throw new Error("UNKNOWN_PORTAL");
  const { session, error } = await requireSession(portal);
  if (!session) throw new Error(error ?? "UNAUTHENTICATED");
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  return { session, keys, portal, base: portal.base };
}

function firstIssue(e: { issues: { message: string }[] }) {
  return e.issues[0]?.message ?? "Invalid input.";
}

function toDate(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? new Date(s) : null;
}
function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

function parseJsonArray(v: string | undefined): any[] {
  if (!v) return [];
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Temporary password that satisfies the standard password policy. */
function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < 14) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

/* ------------------------------- TENANTS -------------------------------- */

export async function saveTenantAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (session.tenantId !== null) return { error: "Only platform administrators manage tenants." };

  const id = str(fd, "id");
  if (!can(keys, id ? "tenant.update" : "tenant.create")) return { error: "You do not have permission." };

  const parsed = tenantSchema.safeParse({
    name: str(fd, "name"),
    logoUrl: str(fd, "logoUrl"),
    subdomain: str(fd, "subdomain").toLowerCase(),
    type: str(fd, "type"),
    contactPerson: str(fd, "contactPerson"),
    email: str(fd, "email"),
    contactNo: str(fd, "contactNo"),
    companyName: str(fd, "companyName"),
    industry: str(fd, "industry"),
    tin: str(fd, "tin"),
    businessRegNo: str(fd, "businessRegNo"),
    addressLine1: str(fd, "addressLine1"),
    addressLine2: str(fd, "addressLine2"),
    city: str(fd, "city"),
    stateProvince: str(fd, "stateProvince"),
    postalCode: str(fd, "postalCode"),
    country: str(fd, "country"),
    website: str(fd, "website"),
    subscriptionStart: str(fd, "subscriptionStart"),
    subscriptionEnd: str(fd, "subscriptionEnd"),
    billingCycle: str(fd, "billingCycle"),
    paymentMethod: str(fd, "paymentMethod"),
    status: str(fd, "status"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const clash = await prisma.tenant.findUnique({ where: { subdomain: d.subdomain } });
  if (clash && clash.id !== id) return { error: "That tenant URL is already taken." };

  const data = {
    name: d.name,
    logoUrl: d.logoUrl || null,
    subdomain: d.subdomain,
    type: d.type,
    contactPerson: d.contactPerson,
    email: d.email,
    contactNo: d.contactNo,
    companyName: d.companyName,
    industry: d.industry,
    tin: d.tin || null,
    businessRegNo: d.businessRegNo || null,
    addressLine1: d.addressLine1 || null,
    addressLine2: d.addressLine2 || null,
    city: d.city || null,
    stateProvince: d.stateProvince || null,
    postalCode: d.postalCode || null,
    country: d.country || null,
    website: d.website || null,
    subscriptionStart: toDate(fd.get("subscriptionStart")),
    subscriptionEnd: toDate(fd.get("subscriptionEnd")),
    billingCycle: d.billingCycle,
    paymentMethod: d.paymentMethod,
    status: d.status,
  };

  if (id) {
    const before = await prisma.tenant.findUnique({ where: { id } });
    const saved = await prisma.tenant.update({ where: { id }, data });
    await recordChange({
      tenantId: session.tenantId,
      actorId: session.sub,
      entity: "Tenant",
      entityId: saved.id,
      entityName: saved.name,
      action: "UPDATE",
      before,
      after: data,
    });
    revalidatePath(`${base}/dashboard/tenants`);
    revalidatePath(`${base}/dashboard/tenants/${saved.id}`);
    return { success: "Tenant updated.", id: saved.id };
  }

  // Creating a tenant also provisions its first administrator. The generated
  // password is returned once so the platform admin can hand it over.
  const tempPassword = generatePassword();
  const passwordHash = await hashPassword(tempPassword);

  const saved = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data });

    // The "Tenant Admin" role is global (tenantId NULL) and shared by every
    // tenant, so a large tenant count does not multiply admin roles.
    let adminRole = await tx.role.findFirst({
      where: { tenantId: null, name: TENANT_ADMIN_ROLE },
    });
    if (!adminRole) {
      adminRole = await tx.role.create({
        data: {
          tenantId: null,
          name: TENANT_ADMIN_ROLE,
          description: "Full access within a tenant workspace",
          isSystem: true,
        },
      });
      const perms = await tx.permission.findMany({ where: { key: { in: TENANT_ADMIN_KEYS } } });
      await tx.rolePermission.createMany({
        data: perms.map((pm) => ({ roleId: adminRole!.id, permissionId: pm.id })),
        skipDuplicates: true,
      });
    }

    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        firstName: d.contactPerson.split(" ")[0] || "Tenant",
        lastName: d.contactPerson.split(" ").slice(1).join(" ") || "Admin",
        email: d.email.toLowerCase(),
        passwordHash,
        isSuperAdmin: false,
        status: "ACTIVE",
      },
    });

    await tx.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });
    return tenant;
  });

  revalidatePath(`${base}/dashboard/tenants`);
  revalidatePath(`${base}/dashboard/tenants/${saved.id}`);
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Tenant",
    entityId: saved.id,
    entityName: saved.name,
    action: "CREATE",
    after: data,
  });
  return {
    success: `Tenant created. Admin login: ${d.email.toLowerCase()} · temporary password: ${tempPassword}`,
    id: saved.id,
  };
}

export async function deleteTenantAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (session.tenantId !== null || !can(keys, "tenant.delete")) return;
  const id = str(fd, "id");
  const before = await prisma.tenant.findUnique({ where: { id } });
  if (!before) return;
  await prisma.tenant.delete({ where: { id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Tenant",
    entityId: id,
    entityName: before.name,
    action: "DELETE",
    before,
  });
  revalidatePath(`${base}/dashboard/tenants`);
  redirect(`${base}/dashboard/tenants`);
}

/* -------------------------------- USERS --------------------------------- */

export async function saveUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  const id = str(fd, "id");
  if (!can(keys, id ? "user.update" : "user.create")) return { error: "You do not have permission." };

  const password = str(fd, "password");
  const roleIds = fd.getAll("roleIds").map(String).filter(Boolean);
  const locationIds = fd.getAll("locationIds").map(String).filter(Boolean);

  const fields = {
    firstName: str(fd, "firstName"),
    lastName: str(fd, "lastName"),
    email: str(fd, "email").toLowerCase(),
    roleIds,
    locationIds,
  };

  // On edit, password is optional (blank = keep current)
  const parsed = id && !password
    ? userSchema.omit({ password: true }).safeParse(fields)
    : userSchema.safeParse({ ...fields, password });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // Platform admin creates users with tenant_id = null; tenant users belong to the tenant.
  const tenantId = session.tenantId;

  const dup = await prisma.user.findFirst({ where: { email: fields.email, tenantId } });
  if (dup && dup.id !== id) return { error: "A user with that email already exists here." };

  if (tenantId) {
    // Allow tenant-owned roles AND the shared global "Tenant Admin" role
    // (which is tenantId NULL by design and can be assigned to tenant users).
    const validRoles = await prisma.role.count({
      where: {
        id: { in: roleIds },
        OR: [{ tenantId }, { name: "Tenant Admin", tenantId: null, isSystem: true }],
      },
    });
    if (validRoles !== roleIds.length) return { error: "Invalid role selection." };
    const validLocs = await prisma.location.count({ where: { id: { in: locationIds }, tenantId } });
    if (validLocs !== locationIds.length) return { error: "Invalid branch/warehouse selection." };
  }

  const data = {
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    tenantId,
    ...(password ? { passwordHash: await hashPassword(password) } : {}),
  };

  const beforeUser = id ? await prisma.user.findUnique({ where: { id } }) : null;

  const user = id
    ? await prisma.user.update({ where: { id }, data })
    : await prisma.user.create({ data: { ...data, passwordHash: data.passwordHash! } });

  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  if (roleIds.length)
    await prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: user.id, roleId })) });

  await prisma.userLocation.deleteMany({ where: { userId: user.id } });
  if (locationIds.length)
    await prisma.userLocation.createMany({
      data: locationIds.map((locationId, i) => ({ userId: user.id, locationId, isPrimary: i === 0 })),
    });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "User",
    entityId: user.id,
    entityName: `${user.firstName} ${user.lastName}`.trim(),
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeUser : null,
    after: data,
  });

  revalidatePath(`${base}/dashboard/users`);
  revalidatePath(`${base}/dashboard/users/${user.id}`);
  return { success: id ? "User updated." : "User created.", id: user.id };
}

export async function deleteUserAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (!can(keys, "user.delete")) return;
  const id = str(fd, "id");
  if (id === session.sub) return; // cannot delete self
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.tenantId !== session.tenantId) return;
  await prisma.user.delete({ where: { id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "User",
    entityId: id,
    entityName: `${target.firstName} ${target.lastName}`.trim(),
    action: "DELETE",
    before: target,
  });
  revalidatePath(`${base}/dashboard/users`);
  redirect(`${base}/dashboard/users`);
}

/* -------------------------------- ROLES --------------------------------- */

export async function saveRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  const id = str(fd, "id");
  if (!can(keys, id ? "role.update" : "role.create")) return { error: "You do not have permission." };

  // Tenants may not edit global system roles (e.g. the shared "Tenant Admin" role).
  if (id && session.tenantId) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== session.tenantId)
      return { error: "This role cannot be modified from a tenant workspace." };
  }

  const permissionIds = fd.getAll("permissionIds").map(String).filter(Boolean);
  const parsed = roleSchema.safeParse({
    name: str(fd, "name"),
    description: str(fd, "description"),
    permissionIds,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const tenantId = session.tenantId;

  // Tenants may combine permissions into roles, but never platform-only permissions.
  if (tenantId) {
    const perms = await prisma.permission.findMany({ where: { id: { in: permissionIds } } });
    if (perms.some((p) => PLATFORM_ONLY_KEYS.has(p.key)))
      return { error: "One or more selected permissions are restricted to platform administrators." };
  }

  const dup = await prisma.role.findFirst({ where: { name: parsed.data.name, tenantId } });
  if (dup && dup.id !== id) return { error: "A role with that name already exists." };

  const beforeRole = id ? await prisma.role.findUnique({ where: { id } }) : null;

  const role = id
    ? await prisma.role.update({
        where: { id },
        data: { name: parsed.data.name, description: parsed.data.description || null },
      })
    : await prisma.role.create({
        data: { name: parsed.data.name, description: parsed.data.description || null, tenantId },
      });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  if (permissionIds.length)
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Role",
    entityId: role.id,
    entityName: role.name,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeRole : null,
    after: { name: role.name, description: role.description, permissionIds },
  });

  revalidatePath(`${base}/dashboard/roles`);
  revalidatePath(`${base}/dashboard/roles/${role.id}`);
  return { success: id ? "Role updated." : "Role created.", id: role.id };
}

export async function deleteRoleAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (!can(keys, "role.delete")) return;
  const id = str(fd, "id");
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role || role.tenantId !== session.tenantId || role.isSystem) return;
  await prisma.role.delete({ where: { id: role.id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Role",
    entityId: role.id,
    entityName: role.name,
    action: "DELETE",
    before: role,
  });
  revalidatePath(`${base}/dashboard/roles`);
  redirect(`${base}/dashboard/roles`);
}

/* ----------------------------- PERMISSIONS ------------------------------ */
/* Only platform admins may add permissions. Tenants can only combine them. */

export async function savePermissionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (session.tenantId !== null) return { error: "Tenants cannot create permissions." };
  if (!can(keys, "permission.manage")) return { error: "You do not have permission." };

  const parsed = permissionSchema.safeParse({
    key: str(fd, "key").toLowerCase(),
    module: str(fd, "module"),
    description: str(fd, "description"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const exists = await prisma.permission.findUnique({ where: { key: parsed.data.key } });
  if (exists) return { error: "That permission key already exists." };

  const created = await prisma.permission.create({
    data: {
      key: parsed.data.key,
      module: parsed.data.module,
      description: parsed.data.description || null,
    },
  });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Permission",
    entityId: created.id,
    entityName: created.key,
    action: "CREATE",
    after: { key: created.key, module: created.module, description: created.description },
  });
  revalidatePath(`${base}/dashboard/permissions`);
  return { success: "Permission created." };
}

/* ---------------------- BRANCHES / WAREHOUSES --------------------------- */

export async function saveLocationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (session.tenantId === null) return { error: "Branches are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "location.update" : "location.create")) return { error: "You do not have permission." };

  const parsed = locationSchema.safeParse({
    code: str(fd, "code").toUpperCase(),
    name: str(fd, "name"),
    type: str(fd, "type"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    contactNo: str(fd, "contactNo"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.location.findFirst({
    where: { code: d.code, tenantId: session.tenantId },
  });
  if (dup && dup.id !== id) return { error: "That code is already used." };

  const data = {
    code: d.code,
    name: d.name,
    type: d.type,
    address: d.address || null,
    city: d.city || null,
    contactNo: d.contactNo || null,
  };

  const beforeLoc = id ? await prisma.location.findUnique({ where: { id } }) : null;

  const saved = id
    ? await prisma.location.update({ where: { id }, data })
    : await prisma.location.create({ data: { ...data, tenantId: session.tenantId } });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Location",
    entityId: saved.id,
    entityName: saved.name,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeLoc : null,
    after: data,
  });

  revalidatePath(`${base}/dashboard/locations`);
  revalidatePath(`${base}/dashboard/locations/${saved.id}`);
  return { success: id ? "Location updated." : "Location created.", id: saved.id };
}

export async function deleteLocationAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (!can(keys, "location.delete") || !session.tenantId) return;
  const id = str(fd, "id");
  const loc = await prisma.location.findUnique({ where: { id } });
  if (!loc || loc.tenantId !== session.tenantId) return;
  await prisma.location.delete({ where: { id: loc.id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Location",
    entityId: loc.id,
    entityName: loc.name,
    action: "DELETE",
    before: loc,
  });
  revalidatePath(`${base}/dashboard/locations`);
  redirect(`${base}/dashboard/locations`);
}

/* ---------------------------- INVENTORY ---------------------------- */

export async function saveCategoryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Categories are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.category.update" : "inventory.category.create")) return { error: "You do not have permission." };

  const parsed = categorySchema.safeParse({
    name: str(fd, "name"),
    parentId: str(fd, "parentId"),
    description: str(fd, "description"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const parentId = d.parentId || null;

  const dup = await prisma.category.findFirst({ where: { tenantId: session.tenantId, name: d.name } });
  if (dup && dup.id !== id) return { error: "A category with that name already exists." };

  const data = { name: d.name, description: d.description || null, parentId };

  const beforeCat = id ? await prisma.category.findUnique({ where: { id } }) : null;
  const saved = id
    ? await prisma.category.update({ where: { id }, data })
    : await prisma.category.create({ data: { ...data, tenantId: session.tenantId } });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Category",
    entityId: saved.id,
    entityName: saved.name,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeCat : null,
    after: data as any,
  });

  revalidatePath(`${base}/dashboard/inventory/categories`);
  revalidatePath(`${base}/dashboard/inventory/categories/${saved.id}`);
  return { success: id ? "Category updated." : "Category created.", id: saved.id };
}

export async function deleteCategoryAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (!can(keys, "inventory.category.delete") || !session.tenantId) return;
  const id = str(fd, "id");
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.tenantId !== session.tenantId) return;
  await prisma.category.delete({ where: { id: cat.id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Category",
    entityId: cat.id,
    entityName: cat.name,
    action: "DELETE",
    before: cat,
  });
  revalidatePath(`${base}/dashboard/inventory/categories`);
  redirect(`${base}/dashboard/inventory/categories`);
}

export async function saveBrandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Brands are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.brand.update" : "inventory.brand.create")) return { error: "You do not have permission." };

  const parsed = brandSchema.safeParse({
    name: str(fd, "name"),
    description: str(fd, "description"),
    website: str(fd, "website"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.brand.findFirst({ where: { tenantId: session.tenantId, name: d.name } });
  if (dup && dup.id !== id) return { error: "A brand with that name already exists." };

  const data = { name: d.name, description: d.description || null, website: d.website || null };

  const beforeBrand = id ? await prisma.brand.findUnique({ where: { id } }) : null;
  const saved = id
    ? await prisma.brand.update({ where: { id }, data })
    : await prisma.brand.create({ data: { ...data, tenantId: session.tenantId } });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Brand",
    entityId: saved.id,
    entityName: saved.name,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeBrand : null,
    after: data as any,
  });

  revalidatePath(`${base}/dashboard/inventory/brands`);
  revalidatePath(`${base}/dashboard/inventory/brands/${saved.id}`);
  return { success: id ? "Brand updated." : "Brand created.", id: saved.id };
}

export async function deleteBrandAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (!can(keys, "inventory.brand.delete") || !session.tenantId) return;
  const id = str(fd, "id");
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand || brand.tenantId !== session.tenantId) return;
  await prisma.brand.delete({ where: { id: brand.id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Brand",
    entityId: brand.id,
    entityName: brand.name,
    action: "DELETE",
    before: brand,
  });
  revalidatePath(`${base}/dashboard/inventory/brands`);
  redirect(`${base}/dashboard/inventory/brands`);
}

export async function saveSupplierAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Suppliers are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.supplier.update" : "inventory.supplier.create")) return { error: "You do not have permission." };

  const parsed = supplierSchema.safeParse({
    name: str(fd, "name"),
    contactPerson: str(fd, "contactPerson"),
    email: str(fd, "email"),
    contactNo: str(fd, "contactNo"),
    addressLine1: str(fd, "addressLine1"),
    addressLine2: str(fd, "addressLine2"),
    city: str(fd, "city"),
    stateProvince: str(fd, "stateProvince"),
    postalCode: str(fd, "postalCode"),
    country: str(fd, "country"),
    tin: str(fd, "tin"),
    businessRegNo: str(fd, "businessRegNo"),
    notes: str(fd, "notes"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const data = {
    name: d.name,
    contactPerson: d.contactPerson || null,
    email: d.email || null,
    contactNo: d.contactNo || null,
    addressLine1: d.addressLine1 || null,
    addressLine2: d.addressLine2 || null,
    city: d.city || null,
    stateProvince: d.stateProvince || null,
    postalCode: d.postalCode || null,
    country: d.country || null,
    tin: d.tin || null,
    businessRegNo: d.businessRegNo || null,
    notes: d.notes || null,
  };

  const beforeSupplier = id ? await prisma.supplier.findUnique({ where: { id } }) : null;
  const saved = id
    ? await prisma.supplier.update({ where: { id }, data })
    : await prisma.supplier.create({ data: { ...data, tenantId: session.tenantId } });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Supplier",
    entityId: saved.id,
    entityName: saved.name,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeSupplier : null,
    after: data as any,
  });

  revalidatePath(`${base}/dashboard/inventory/suppliers`);
  revalidatePath(`${base}/dashboard/inventory/suppliers/${saved.id}`);
  return { success: id ? "Supplier updated." : "Supplier created.", id: saved.id };
}

export async function deleteSupplierAction(fd: FormData) {
  const { session, keys, base } = await ctx(fd);
  if (!can(keys, "inventory.supplier.delete") || !session.tenantId) return;
  const id = str(fd, "id");
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.tenantId !== session.tenantId) return;
  await prisma.supplier.delete({ where: { id: supplier.id } });
  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Supplier",
    entityId: supplier.id,
    entityName: supplier.name,
    action: "DELETE",
    before: supplier,
  });
  revalidatePath(`${base}/dashboard/inventory/suppliers`);
  redirect(`${base}/dashboard/inventory/suppliers`);
}

export async function saveProductAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Products are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.product.update" : "inventory.product.create")) return { error: "You do not have permission." };

  const parsed = productSchema.safeParse({
    sku: str(fd, "sku"),
    name: str(fd, "name"),
    description: str(fd, "description"),
    productType: str(fd, "productType"),
    categoryId: str(fd, "categoryId"),
    brandId: str(fd, "brandId"),
    unitOfMeasure: str(fd, "unitOfMeasure"),
    costPrice: str(fd, "costPrice"),
    sellingPrice: str(fd, "sellingPrice"),
    minStockLevel: str(fd, "minStockLevel"),
    reorderPoint: str(fd, "reorderPoint"),
    pricesJson: str(fd, "pricesJson"),
    barcodesJson: str(fd, "barcodesJson"),
    serialsJson: str(fd, "serialsJson"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.product.findFirst({ where: { tenantId: session.tenantId, sku: d.sku } });
  if (dup && dup.id !== id) return { error: "A product with that SKU already exists." };

  const validCategory = await prisma.category.count({ where: { id: d.categoryId, tenantId: session.tenantId } });
  if (!validCategory) return { error: "Invalid category." };

  const brandId = d.brandId || null;
  if (brandId) {
    const validBrand = await prisma.brand.count({ where: { id: brandId, tenantId: session.tenantId } });
    if (!validBrand) return { error: "Invalid brand." };
  }

  const data = {
    sku: d.sku,
    name: d.name,
    description: d.description || null,
    productType: d.productType,
    categoryId: d.categoryId,
    brandId,
    unitOfMeasure: d.unitOfMeasure || null,
    costPrice: d.costPrice ? parseFloat(d.costPrice) : null,
    sellingPrice: d.sellingPrice ? parseFloat(d.sellingPrice) : null,
    minStockLevel: d.minStockLevel ? parseInt(d.minStockLevel, 10) : 0,
    reorderPoint: d.reorderPoint ? parseInt(d.reorderPoint, 10) : 0,
    prices: parseJsonArray(d.pricesJson),
  };

  const beforeProduct = id ? await prisma.product.findUnique({ where: { id } }) : null;
  const saved = id
    ? await prisma.product.update({ where: { id }, data })
    : await prisma.product.create({ data: { ...data, tenantId: session.tenantId } });

  // Price tiers are stored on the product.prices JSON column (above).
  // Serialized + Barcode products also get child records for scanning/lookup.
  if (d.productType === "BARCODE" && d.barcodesJson) {
    const list = parseJsonArray(d.barcodesJson) as any[];
    if (list.length) {
      await prisma.productBarcode.deleteMany({ where: { productId: saved.id } });
      await prisma.productBarcode.createMany({
        data: list.map((b) => ({
          tenantId: session.tenantId!,
          productId: saved.id,
          barcode: String(b.barcode),
          format: String(b.format || "CODE128"),
          isPrimary: Boolean(b.isPrimary),
        })),
      });
    }
  }
  if (d.productType === "SERIALIZED" && d.serialsJson) {
    const list = parseJsonArray(d.serialsJson) as any[];
    if (list.length) {
      await prisma.productSerial.deleteMany({ where: { productId: saved.id } });
      await prisma.productSerial.createMany({
        data: list.map((s) => ({
          tenantId: session.tenantId!,
          productId: saved.id,
          serialNo: String(s.serialNo),
          status: "AVAILABLE",
        })),
      });
    }
  }

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Product",
    entityId: saved.id,
    entityName: saved.name,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforeProduct : null,
    after: data as any,
  });

  revalidatePath(`${base}/dashboard/inventory/products`);
  revalidatePath(`${base}/dashboard/inventory/products/${saved.id}/edit`);
  return { success: id ? "Product updated." : "Product created.", id: saved.id };
}

export async function savePurchaseOrderAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Purchase orders are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.purchase_order.update" : "inventory.purchase_order.create")) return { error: "You do not have permission." };

  const parsed = purchaseOrderSchema.safeParse({
    referenceNo: str(fd, "referenceNo"),
    supplierId: str(fd, "supplierId"),
    expectedDate: str(fd, "expectedDate"),
    notes: str(fd, "notes"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const supplier = await prisma.supplier.findUnique({ where: { id: d.supplierId } });
  if (!supplier || supplier.tenantId !== session.tenantId) return { error: "Invalid supplier." };

  const data = {
    referenceNo: d.referenceNo || null,
    supplierId: d.supplierId,
    expectedDate: toDate(fd.get("expectedDate")),
    notes: d.notes || null,
  };

  const beforePo = id ? await prisma.purchaseOrder.findUnique({ where: { id } }) : null;
  const saved = id
    ? await prisma.purchaseOrder.update({ where: { id }, data })
    : await prisma.purchaseOrder.create({ data: { ...data, tenantId: session.tenantId } });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "PurchaseOrder",
    entityId: saved.id,
    entityName: saved.referenceNo || saved.id,
    action: id ? "UPDATE" : "CREATE",
    before: id ? beforePo : null,
    after: data as any,
  });

  revalidatePath(`${base}/dashboard/inventory/purchase-orders`);
  revalidatePath(`${base}/dashboard/inventory/purchase-orders/${saved.id}`);
  return { success: id ? "Purchase order updated." : "Purchase order created.", id: saved.id };
}

export async function saveStockInAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Stock in is managed inside a tenant workspace." };
  if (!can(keys, "inventory.stock_in.create")) return { error: "You do not have permission." };

  const parsed = stockInSchema.safeParse({
    purchaseOrderId: str(fd, "purchaseOrderId"),
    referenceNo: str(fd, "referenceNo"),
    receivedBy: str(fd, "receivedBy"),
    notes: str(fd, "notes"),
    productId: str(fd, "productId"),
    quantity: str(fd, "quantity"),
    unitCost: str(fd, "unitCost"),
    expiryDate: str(fd, "expiryDate"),
    batchNo: str(fd, "batchNo"),
    itemNotes: str(fd, "itemNotes"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!product || product.tenantId !== session.tenantId) return { error: "Invalid product." };

  const saved = await prisma.$transaction(async (tx) => {
    const stockIn = await tx.stockIn.create({
      data: {
        tenantId: session.tenantId,
        purchaseOrderId: d.purchaseOrderId || null,
        referenceNo: d.referenceNo || null,
        receivedBy: d.receivedBy || null,
        notes: d.notes || null,
      } as any,
    });

    await tx.stockInItem.create({
      data: {
        tenantId: session.tenantId,
        stockInId: stockIn.id,
        productId: d.productId,
        quantity: parseInt(d.quantity, 10),
        unitCost: d.unitCost ? parseFloat(d.unitCost) : 0,
        expiryDate: toDate(fd.get("expiryDate")),
        batchNo: d.batchNo || null,
        notes: d.itemNotes || null,
      } as any,
    });

    const stockLevel = await tx.productStockLevel.upsert({
      where: { tenantId_productId_locationId: { tenantId: session.tenantId, productId: d.productId, locationId: null } } as any,
      update: { quantity: { increment: parseInt(d.quantity, 10) } },
      create: { tenantId: session.tenantId, productId: d.productId, locationId: null, quantity: parseInt(d.quantity, 10), reserved: 0 } as any,
    });

    await tx.stockMovement.create({
      data: {
        tenantId: session.tenantId,
        productId: d.productId,
        stockLevelId: stockLevel.id,
        type: "PURCHASE",
        quantity: parseInt(d.quantity, 10),
        reference: stockIn.id,
        notes: d.notes || null,
      } as any,
    });

    return stockIn;
  });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "StockIn",
    entityId: saved.id,
    entityName: saved.referenceNo || saved.id,
    action: "CREATE",
    after: { referenceNo: saved.referenceNo, productId: d.productId, quantity: d.quantity } as any,
  });

  revalidatePath(`${base}/dashboard/inventory/stock-in`);
  return { success: "Stock in recorded.", id: saved.id };
}

export async function saveSalesOrderAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Sales orders are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.sales_order.update" : "inventory.sales_order.create")) return { error: "You do not have permission." };

  const parsed = salesOrderSchema.safeParse({
    customerName: str(fd, "customerName"),
    customerEmail: str(fd, "customerEmail"),
    contactNo: str(fd, "contactNo"),
    shippingAddress: str(fd, "shippingAddress"),
    referenceNo: str(fd, "referenceNo"),
    notes: str(fd, "notes"),
    productId: str(fd, "productId"),
    quantity: str(fd, "quantity"),
    unitPrice: str(fd, "unitPrice"),
    discount: str(fd, "discount"),
    tax: str(fd, "tax"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!product || product.tenantId !== session.tenantId) return { error: "Invalid product." };

  const saved = await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.create({
      data: {
        tenantId: session.tenantId,
        customerName: d.customerName,
        customerEmail: d.customerEmail ?? undefined,
        contactNo: d.contactNo ?? undefined,
        shippingAddress: d.shippingAddress ?? undefined,
        referenceNo: d.referenceNo ?? undefined,
        notes: d.notes ?? undefined,
        createdById: session.sub,
      } as any,
    });

    await tx.salesOrderItem.create({
      data: {
        tenantId: session.tenantId,
        salesOrderId: order.id,
        productId: d.productId,
        quantity: parseInt(d.quantity, 10),
        unitPrice: d.unitPrice ? parseFloat(d.unitPrice) : product.sellingPrice || 0,
        discount: d.discount ? parseFloat(d.discount) : 0,
        tax: d.tax ? parseFloat(d.tax) : 0,
      } as any,
    });

    return order;
  });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "SalesOrder",
    entityId: saved.id,
    entityName: saved.referenceNo || saved.id,
    action: "CREATE",
    after: { customerName: d.customerName, productId: d.productId, quantity: d.quantity } as any,
  });

  revalidatePath(`${base}/dashboard/inventory/sales-orders`);
  return { success: "Sales order created.", id: saved.id };
}

export async function saveQuotationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return { error: "Quotations are managed inside a tenant workspace." };
  const id = str(fd, "id");
  if (!can(keys, id ? "inventory.quotation.update" : "inventory.quotation.create")) return { error: "You do not have permission." };

  const parsed = quotationSchema.safeParse({
    customerName: str(fd, "customerName"),
    customerEmail: str(fd, "customerEmail"),
    contactNo: str(fd, "contactNo"),
    expiryDate: str(fd, "expiryDate"),
    referenceNo: str(fd, "referenceNo"),
    notes: str(fd, "notes"),
    productId: str(fd, "productId"),
    quantity: str(fd, "quantity"),
    unitPrice: str(fd, "unitPrice"),
    discount: str(fd, "discount"),
    tax: str(fd, "tax"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!product || product.tenantId !== session.tenantId) return { error: "Invalid product." };

  const saved = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.create({
      data: {
        tenantId: session.tenantId,
        customerName: d.customerName,
        customerEmail: d.customerEmail ?? undefined,
        contactNo: d.contactNo ?? undefined,
        expiryDate: toDate(fd.get("expiryDate")),
        referenceNo: d.referenceNo ?? undefined,
        notes: d.notes ?? undefined,
        createdById: session.sub,
      } as any,
    });

    await tx.quotationItem.create({
      data: {
        tenantId: session.tenantId,
        quotationId: quotation.id,
        productId: d.productId,
        quantity: parseInt(d.quantity, 10),
        unitPrice: d.unitPrice ? parseFloat(d.unitPrice) : product.sellingPrice || 0,
        discount: d.discount ? parseFloat(d.discount) : 0,
        tax: d.tax ? parseFloat(d.tax) : 0,
      } as any,
    });

    return quotation;
  });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Quotation",
    entityId: saved.id,
    entityName: saved.referenceNo || saved.id,
    action: "CREATE",
    after: { customerName: d.customerName, productId: d.productId, quantity: d.quantity } as any,
  });

  revalidatePath(`${base}/dashboard/inventory/quotations`);
  return { success: "Quotation created.", id: saved.id };
}

export async function convertQuotationToSalesOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return {};
  if (!can(keys, "inventory.sales_order.create")) return {};

  const quotationId = str(fd, "quotationId");
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation || quotation.tenantId !== session.tenantId) return {};

  if (quotation.status === "CONVERTED") {
    return { error: "This quotation is already converted." };
  }

  const saved = await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.create({
      data: {
        tenantId: session.tenantId,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail ?? undefined,
        contactNo: quotation.contactNo ?? undefined,
        referenceNo: quotation.referenceNo ?? undefined,
        notes: quotation.notes ?? undefined,
        createdById: session.sub,
      } as any,
    });

    const items = await tx.quotationItem.findMany({ where: { quotationId } });
    for (const item of items) {
      await tx.salesOrderItem.create({
        data: {
          tenantId: session.tenantId,
          salesOrderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
        } as any,
      });
    }

    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: "CONVERTED", convertedToId: order.id },
    });

    return order;
  });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "Quotation",
    entityId: quotation.id,
    entityName: quotation.referenceNo || quotation.id,
    action: "UPDATE",
    before: { status: quotation.status },
    after: { status: "CONVERTED", salesOrderId: saved.id } as any,
  });

  revalidatePath(`${base}/dashboard/inventory/quotations`);
  revalidatePath(`${base}/dashboard/inventory/quotations/${quotation.id}`);
  return { success: "Quotation converted to sales order.", id: saved.id };
}

export async function saveStockMovementAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys, base } = await ctx(fd);
  if (!session.tenantId) return {};
  if (!can(keys, "inventory.stock_movement.create")) return {};

  const parsed = stockMovementSchema.safeParse({
    productId: str(fd, "productId"),
    type: str(fd, "type"),
    quantity: str(fd, "quantity"),
    reference: str(fd, "reference"),
    notes: str(fd, "notes"),
    serialId: str(fd, "serialId"),
    barcode: str(fd, "barcode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const d = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!product || product.tenantId !== session.tenantId) {
    return { error: "Product not found." };
  }

  const qty = parseInt(d.quantity, 10);
  if (Number.isNaN(qty) || qty === 0) {
    return { error: "Quantity must be a non-zero number." };
  }

  if (product.productType === "SERIALIZED" && d.type === "SALE") {
    if (!d.serialId) return { error: "Serial number is required for serialized product stock-out." };
    const serial = await prisma.productSerial.findUnique({ where: { id: d.serialId } });
    if (!serial || serial.tenantId !== session.tenantId || serial.productId !== product.id) {
      return { error: "Serial number not found for this product." };
    }
    if (serial.status !== "AVAILABLE") {
      return { error: "Serial number is not available for sale." };
    }
  }

  if (product.productType === "BARCODE") {
    if (d.type === "PURCHASE" && !d.barcode) {
      return { error: "Barcode is required for barcode product stock-in." };
    }
    if (d.type === "SALE" && !d.barcode) {
      return { error: "Barcode is required for barcode product stock-out." };
    }
  }

  const saved = await prisma.$transaction(async (tx) => {
    let stockLevel = await tx.productStockLevel.findFirst({
      where: { tenantId: { equals: session.tenantId! }, productId: { equals: product.id } },
    });

    if (!stockLevel) {
      stockLevel = await tx.productStockLevel.create({
        data: {
          tenantId: session.tenantId,
          productId: product.id,
          quantity: 0,
          reserved: 0,
        } as any,
      });
    }

    const currentQty = stockLevel.quantity;
    const nextQty = currentQty + qty;
    if (nextQty < 0) {
      throw new Error("Insufficient stock.");
    }

    if (product.productType === "SERIALIZED" && d.type === "SALE" && d.serialId) {
      await tx.productSerial.update({
        where: { id: d.serialId },
        data: { status: "SOLD" },
      } as any);
    }

    if (product.productType === "BARCODE" && d.type === "PURCHASE" && d.barcode) {
      await tx.productBarcode.create({
        data: {
          tenantId: session.tenantId,
          productId: product.id,
          barcode: d.barcode,
        } as any,
      });
    }

    const updated = await tx.productStockLevel.update({
      where: { id: stockLevel.id },
      data: { quantity: nextQty } as any,
    });

    const movement = await tx.stockMovement.create({
      data: {
        tenantId: session.tenantId!,
        productId: product.id,
        stockLevelId: stockLevel.id,
        serialId: d.serialId || null,
        type: d.type as any,
        quantity: qty,
        reference: d.reference || null,
        notes: d.notes || null,
      } as any,
    });

    return { stockLevel: updated, movement };
  });

  await recordChange({
    tenantId: session.tenantId,
    actorId: session.sub,
    entity: "StockMovement",
    entityId: saved.movement.id,
    entityName: product.name,
    action: "CREATE",
    after: { type: d.type, quantity: qty, productId: product.id } as any,
  });

  revalidatePath(`${base}/dashboard/inventory/stock-movements`);
  return { success: "Stock movement recorded." };
}
