import { z } from "zod";
import { validateSlug } from "./tenant";

/** Standard password rules: min 10, upper, lower, digit, special. */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a number.")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character.");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const userSchema = z.object({
  firstName: z.string().min(1, "First name is required.").max(60),
  lastName: z.string().min(1, "Last name is required.").max(60),
  email: z.string().email("Enter a valid email address."),
  password: passwordSchema,
  roleIds: z.array(z.string()).optional().default([]),
  locationIds: z.array(z.string()).optional().default([]),
});

export const tenantSchema = z.object({
  name: z.string().min(2, "Tenant name is required.").max(120),
  logoUrl: z.string().url("Logo must be a valid URL.").optional().or(z.literal("")),
  subdomain: z.string().superRefine((val, ctx) => {
    const r = validateSlug(val);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
  }),
  type: z.enum(["CORPORATE", "SME", "ENTERPRISE", "GOVERNMENT", "NONPROFIT"]),
  contactPerson: z.string().min(2, "Contact person is required."),
  email: z.string().email("Enter a valid email address."),
  contactNo: z.string().min(7, "Contact number is required."),
  companyName: z.string().min(2, "Company name is required."),
  industry: z.string().min(2, "Industry is required."),
  tin: z.string().optional().or(z.literal("")),
  businessRegNo: z.string().optional().or(z.literal("")),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  stateProvince: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  subscriptionStart: z.string().optional().or(z.literal("")),
  subscriptionEnd: z.string().optional().or(z.literal("")),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
  paymentMethod: z.enum(["CREDIT_CARD", "BANK_TRANSFER", "GCASH", "MAYA", "CHECK", "CASH"]),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]),
});

export const roleSchema = z.object({
  name: z.string().min(2, "Role name is required.").max(60),
  description: z.string().optional().or(z.literal("")),
  permissionIds: z.array(z.string()).default([]),
});

export const locationSchema = z.object({
  code: z.string().min(1, "Code is required.").max(20),
  name: z.string().min(2, "Name is required."),
  type: z.enum(["BRANCH", "WAREHOUSE"]),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  contactNo: z.string().optional().or(z.literal("")),
});

export const permissionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+[.][a-z0-9_.]+$/, "Key must look like module.action"),
  module: z.string().min(2, "Module is required."),
  description: z.string().optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Category name is required.").max(120),
  parentId: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

export const brandSchema = z.object({
  name: z.string().min(2, "Brand name is required.").max(120),
  description: z.string().optional().or(z.literal("")),
  website: z.string().url("Website must be a valid URL.").optional().or(z.literal("")),
});

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required.").max(160),
  contactPerson: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  contactNo: z.string().optional().or(z.literal("")),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  stateProvince: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  tin: z.string().optional().or(z.literal("")),
  businessRegNo: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required.").max(80),
  name: z.string().min(2, "Product name is required.").max(160),
  description: z.string().optional().or(z.literal("")),
  productType: z.enum(["SERIALIZED", "NON_SERIALIZED", "BARCODE"]),
  categoryId: z.string().min(1, "Category is required."),
  brandId: z.string().optional().or(z.literal("")),
  unitOfMeasure: z.string().optional().or(z.literal("")),
  costPrice: z.string().optional().or(z.literal("")),
  sellingPrice: z.string().optional().or(z.literal("")),
  minStockLevel: z.string().optional().or(z.literal("")),
  reorderPoint: z.string().optional().or(z.literal("")),
  pricesJson: z.string().optional().or(z.literal("")),
  barcodesJson: z.string().optional().or(z.literal("")),
  serialsJson: z.string().optional().or(z.literal("")),
});

export const purchaseOrderSchema = z.object({
  referenceNo: z.string().optional().or(z.literal("")),
  supplierId: z.string().min(1, "Supplier is required."),
  expectedDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const stockInSchema = z.object({
  purchaseOrderId: z.string().optional().or(z.literal("")),
  referenceNo: z.string().optional().or(z.literal("")),
  receivedBy: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  productId: z.string().min(1, "Product is required."),
  quantity: z.string().min(1, "Quantity is required."),
  unitCost: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  batchNo: z.string().optional().or(z.literal("")),
  itemNotes: z.string().optional().or(z.literal("")),
});

export const salesOrderSchema = z.object({
  customerName: z.string().min(2, "Customer name is required.").max(160),
  customerEmail: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  contactNo: z.string().optional().or(z.literal("")),
  shippingAddress: z.string().optional().or(z.literal("")),
  referenceNo: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  productId: z.string().min(1, "Product is required."),
  quantity: z.string().min(1, "Quantity is required."),
  unitPrice: z.string().optional().or(z.literal("")),
  discount: z.string().optional().or(z.literal("")),
  tax: z.string().optional().or(z.literal("")),
});

export const quotationSchema = z.object({
  customerName: z.string().min(2, "Customer name is required.").max(160),
  customerEmail: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  contactNo: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  referenceNo: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  productId: z.string().min(1, "Product is required."),
  quantity: z.string().min(1, "Quantity is required."),
  unitPrice: z.string().optional().or(z.literal("")),
  discount: z.string().optional().or(z.literal("")),
  tax: z.string().optional().or(z.literal("")),
  itemNotes: z.string().optional().or(z.literal("")),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  type: z.enum(["PURCHASE", "SALE", "ADJUSTMENT", "RETURN", "TRANSFER"]),
  quantity: z.string().min(1, "Quantity is required."),
  reference: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  serialId: z.string().optional().or(z.literal("")),
  barcode: z.string().optional().or(z.literal("")),
});
