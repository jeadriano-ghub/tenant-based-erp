export const PERMISSION_CATALOGUE: { key: string; module: string; description: string }[] = [
  { key: "tenant.view", module: "Tenant Management", description: "View tenants" },
  { key: "tenant.create", module: "Tenant Management", description: "Create tenants" },
  { key: "tenant.update", module: "Tenant Management", description: "Update tenants" },
  { key: "tenant.delete", module: "Tenant Management", description: "Delete tenants" },

  { key: "user.view", module: "User Management", description: "View users" },
  { key: "user.create", module: "User Management", description: "Create users" },
  { key: "user.update", module: "User Management", description: "Update users" },
  { key: "user.delete", module: "User Management", description: "Delete users" },

  { key: "role.view", module: "Roles & Permissions", description: "View roles" },
  { key: "role.create", module: "Roles & Permissions", description: "Create roles" },
  { key: "role.update", module: "Roles & Permissions", description: "Update roles" },
  { key: "role.delete", module: "Roles & Permissions", description: "Delete roles" },

  { key: "permission.view", module: "Roles & Permissions", description: "View permission catalogue" },
  { key: "permission.manage", module: "Roles & Permissions", description: "Create/edit permissions (platform admin only)" },

  { key: "location.view", module: "Branch / Warehouse", description: "View branches and warehouses" },
  { key: "location.create", module: "Branch / Warehouse", description: "Create branches and warehouses" },
  { key: "location.update", module: "Branch / Warehouse", description: "Update branches and warehouses" },
  { key: "location.delete", module: "Branch / Warehouse", description: "Delete branches and warehouses" },
];

/** Permissions a tenant may assign to its own roles (everything except platform-only keys). */
export const PLATFORM_ONLY_KEYS = new Set([
  "permission.manage",
  "permission.view",
  "tenant.view",
  "tenant.create",
  "tenant.update",
  "tenant.delete",
]);

export const TENANT_ASSIGNABLE = PERMISSION_CATALOGUE.filter((p) => !PLATFORM_ONLY_KEYS.has(p.key));

/** Name of the global system role assigned to every tenant's first admin user. */
export const TENANT_ADMIN_ROLE = "Tenant Admin";

/**
 * Permissions granted to the global "Tenant Admin" role. Tenant admins run
 * their own workspace: users, roles and locations — never the platform
 * catalogue or other tenants.
 */
export const TENANT_ADMIN_KEYS = [
  "user.view", "user.create", "user.update", "user.delete",
  "role.view", "role.create", "role.update", "role.delete",
  "location.view", "location.create", "location.update", "location.delete",
];
