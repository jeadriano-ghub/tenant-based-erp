"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getPermissionKeys, can, hashPassword, requireSession } from "@/lib/auth";
import {
  tenantSchema, userSchema, roleSchema, locationSchema, permissionSchema,
} from "@/lib/validation";
import { PLATFORM_ONLY_KEYS } from "@/lib/permissions";

export type ActionState = { error?: string; success?: string };

async function ctx() {
  const { session, error } = await requireSession();
  if (!session) throw new Error(error ?? "UNAUTHENTICATED");
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  return { session, keys };
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

/* ------------------------------- TENANTS -------------------------------- */

export async function saveTenantAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys } = await ctx();
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
  if (clash && clash.id !== id) return { error: "That subdomain is already taken." };

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

  if (id) await prisma.tenant.update({ where: { id }, data });
  else await prisma.tenant.create({ data });

  revalidatePath("/dashboard/tenants");
  return { success: id ? "Tenant updated." : "Tenant created." };
}

export async function deleteTenantAction(fd: FormData) {
  const { session, keys } = await ctx();
  if (session.tenantId !== null || !can(keys, "tenant.delete")) return;
  await prisma.tenant.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/dashboard/tenants");
}

/* -------------------------------- USERS --------------------------------- */

export async function saveUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys } = await ctx();
  const id = str(fd, "id");
  if (!can(keys, id ? "user.update" : "user.create")) return { error: "You do not have permission." };

  const password = str(fd, "password");
  const roleIds = fd.getAll("roleIds").map(String).filter(Boolean);
  const locationIds = fd.getAll("locationIds").map(String).filter(Boolean);

  const base = {
    firstName: str(fd, "firstName"),
    lastName: str(fd, "lastName"),
    email: str(fd, "email").toLowerCase(),
    roleIds,
    locationIds,
  };

  // On edit, password is optional (blank = keep current)
  const parsed = id && !password
    ? userSchema.omit({ password: true }).safeParse(base)
    : userSchema.safeParse({ ...base, password });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // Platform admin creates users with tenant_id = null; tenant users belong to the tenant.
  const tenantId = session.tenantId;

  const dup = await prisma.user.findFirst({ where: { email: base.email, tenantId } });
  if (dup && dup.id !== id) return { error: "A user with that email already exists here." };

  if (tenantId) {
    const validRoles = await prisma.role.count({ where: { id: { in: roleIds }, tenantId } });
    if (validRoles !== roleIds.length) return { error: "Invalid role selection." };
    const validLocs = await prisma.location.count({ where: { id: { in: locationIds }, tenantId } });
    if (validLocs !== locationIds.length) return { error: "Invalid branch/warehouse selection." };
  }

  const data = {
    firstName: base.firstName,
    lastName: base.lastName,
    email: base.email,
    tenantId,
    ...(password ? { passwordHash: await hashPassword(password) } : {}),
  };

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

  revalidatePath("/dashboard/users");
  return { success: id ? "User updated." : "User created." };
}

export async function deleteUserAction(fd: FormData) {
  const { session, keys } = await ctx();
  if (!can(keys, "user.delete")) return;
  const id = str(fd, "id");
  if (id === session.sub) return; // cannot delete self
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.tenantId !== session.tenantId) return;
  await prisma.user.delete({ where: { id } });
  revalidatePath("/dashboard/users");
}

/* -------------------------------- ROLES --------------------------------- */

export async function saveRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys } = await ctx();
  const id = str(fd, "id");
  if (!can(keys, id ? "role.update" : "role.create")) return { error: "You do not have permission." };

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

  revalidatePath("/dashboard/roles");
  return { success: id ? "Role updated." : "Role created." };
}

export async function deleteRoleAction(fd: FormData) {
  const { session, keys } = await ctx();
  if (!can(keys, "role.delete")) return;
  const role = await prisma.role.findUnique({ where: { id: str(fd, "id") } });
  if (!role || role.tenantId !== session.tenantId || role.isSystem) return;
  await prisma.role.delete({ where: { id: role.id } });
  revalidatePath("/dashboard/roles");
}

/* ----------------------------- PERMISSIONS ------------------------------ */
/* Only platform admins may add permissions. Tenants can only combine them. */

export async function savePermissionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys } = await ctx();
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

  await prisma.permission.create({
    data: {
      key: parsed.data.key,
      module: parsed.data.module,
      description: parsed.data.description || null,
    },
  });
  revalidatePath("/dashboard/permissions");
  return { success: "Permission created." };
}

/* ---------------------- BRANCHES / WAREHOUSES --------------------------- */

export async function saveLocationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session, keys } = await ctx();
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

  if (id) await prisma.location.update({ where: { id }, data });
  else await prisma.location.create({ data: { ...data, tenantId: session.tenantId } });

  revalidatePath("/dashboard/locations");
  return { success: id ? "Location updated." : "Location created." };
}

export async function deleteLocationAction(fd: FormData) {
  const { session, keys } = await ctx();
  if (!can(keys, "location.delete") || !session.tenantId) return;
  const loc = await prisma.location.findUnique({ where: { id: str(fd, "id") } });
  if (!loc || loc.tenantId !== session.tenantId) return;
  await prisma.location.delete({ where: { id: loc.id } });
  revalidatePath("/dashboard/locations");
}
