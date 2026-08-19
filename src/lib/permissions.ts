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

  { key: "inventory.product.view", module: "Inventory", description: "View products" },
  { key: "inventory.product.create", module: "Inventory", description: "Create products" },
  { key: "inventory.product.update", module: "Inventory", description: "Update products" },
  { key: "inventory.product.delete", module: "Inventory", description: "Delete products" },
  { key: "inventory.category.view", module: "Inventory", description: "View categories" },
  { key: "inventory.category.create", module: "Inventory", description: "Create categories" },
  { key: "inventory.category.update", module: "Inventory", description: "Update categories" },
  { key: "inventory.category.delete", module: "Inventory", description: "Delete categories" },
  { key: "inventory.brand.view", module: "Inventory", description: "View brands" },
  { key: "inventory.brand.create", module: "Inventory", description: "Create brands" },
  { key: "inventory.brand.update", module: "Inventory", description: "Update brands" },
  { key: "inventory.brand.delete", module: "Inventory", description: "Delete brands" },
  { key: "inventory.supplier.view", module: "Inventory", description: "View suppliers" },
  { key: "inventory.supplier.create", module: "Inventory", description: "Create suppliers" },
  { key: "inventory.supplier.update", module: "Inventory", description: "Update suppliers" },
  { key: "inventory.supplier.delete", module: "Inventory", description: "Delete suppliers" },
  { key: "inventory.purchase_order.view", module: "Inventory", description: "View purchase orders" },
  { key: "inventory.purchase_order.create", module: "Inventory", description: "Create purchase orders" },
  { key: "inventory.purchase_order.update", module: "Inventory", description: "Update purchase orders" },
  { key: "inventory.purchase_order.delete", module: "Inventory", description: "Delete purchase orders" },
  { key: "inventory.stock_in.view", module: "Inventory", description: "View stock ins" },
  { key: "inventory.stock_in.create", module: "Inventory", description: "Create stock ins" },
  { key: "inventory.sales_order.view", module: "Inventory", description: "View sales orders" },
  { key: "inventory.sales_order.create", module: "Inventory", description: "Create sales orders" },
  { key: "inventory.sales_order.update", module: "Inventory", description: "Update sales orders" },
  { key: "inventory.sales_order.delete", module: "Inventory", description: "Delete sales orders" },
  { key: "inventory.quotation.view", module: "Inventory", description: "View quotations" },
  { key: "inventory.quotation.create", module: "Inventory", description: "Create quotations" },
  { key: "inventory.quotation.update", module: "Inventory", description: "Update quotations" },
  { key: "inventory.quotation.delete", module: "Inventory", description: "Delete quotations" },
  { key: "inventory.stock_movement.view", module: "Inventory", description: "View stock movements" },
  { key: "inventory.stock_movement.create", module: "Inventory", description: "Create stock movements" },
  { key: "inventory.pos.view", module: "Inventory", description: "View POS" },
  { key: "inventory.pos.create", module: "Inventory", description: "Create POS sales" },
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
  "inventory.product.view", "inventory.product.create", "inventory.product.update", "inventory.product.delete",
  "inventory.category.view", "inventory.category.create", "inventory.category.update", "inventory.category.delete",
  "inventory.brand.view", "inventory.brand.create", "inventory.brand.update", "inventory.brand.delete",
  "inventory.supplier.view", "inventory.supplier.create", "inventory.supplier.update", "inventory.supplier.delete",
  "inventory.purchase_order.view", "inventory.purchase_order.create", "inventory.purchase_order.update", "inventory.purchase_order.delete",
  "inventory.sales_order.view", "inventory.sales_order.create", "inventory.sales_order.update", "inventory.sales_order.delete",
  "inventory.quotation.view", "inventory.quotation.create", "inventory.quotation.update", "inventory.quotation.delete",
  "inventory.stock_movement.view", "inventory.stock_movement.create",
  "inventory.pos.view", "inventory.pos.create",
];
