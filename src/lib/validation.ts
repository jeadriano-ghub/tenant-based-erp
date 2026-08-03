import { z } from "zod";
import { validateSubdomain } from "./tenant";

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
    const r = validateSubdomain(val);
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
  key: z.string().regex(/^[a-z0-9_]+\.[a-z0-9_.]+$/, "Key must look like module.action"),
  module: z.string().min(2, "Module is required."),
  description: z.string().optional().or(z.literal("")),
});
