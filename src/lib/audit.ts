import { prisma } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma";

/** Fields we never surface in an audit/notification diff. */
const SENSITIVE = new Set(["passwordHash", "password"]);

/**
 * Columns that are system metadata, not meaningful "changes" to a human
 * (IDs, timestamps, internal flags).
 */
const IGNORE = new Set([
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
  "isSuperAdmin",
  "passwordHash",
  "password",
]);

/** Human-friendly labels for known fields. */
const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  contactPerson: "Contact person",
  contactNo: "Contact number",
  companyName: "Company name",
  businessRegNo: "Business reg. no.",
  addressLine1: "Address line 1",
  addressLine2: "Address line 2",
  postalCode: "Postal code",
  stateProvince: "State/Province",
  website: "Website",
  subscriptionStart: "Subscription start",
  subscriptionEnd: "Subscription end",
  billingCycle: "Billing cycle",
  paymentMethod: "Payment method",
  type: "Type",
  industry: "Industry",
  tin: "TIN",
  country: "Country",
  city: "City",
  status: "Status",
  name: "Name",
  description: "Description",
  code: "Code",
  address: "Address",
  key: "Key",
  module: "Module",
  isSystem: "System role",
  permissionIds: "Permissions",
  roleIds: "Roles",
  locationIds: "Branches",
};

type AnyRecord = Record<string, unknown>;

/** Strip secrets and null-ify empties for a cleaner before/after diff. */
function clean(obj: AnyRecord | null | undefined): AnyRecord | null {
  if (!obj) return null;
  const out: AnyRecord = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE.has(k)) continue;
    out[k] = v === "" ? null : v;
  }
  return out;
}

function label(k: string): string {
  return FIELD_LABELS[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

/** Render a value for display: dates become localized, objects become JSON. */
function formatVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "removed";
  if (v instanceof Date) return v.toLocaleString();
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") {
    try {
      const s = JSON.stringify(v);
      return s.length > 60 ? s.slice(0, 57) + "…" : s;
    } catch {
      return String(v);
    }
  }
  if (typeof v === "string" && /\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  return String(v);
}

export type ChangeInput = {
  tenantId: string | null;
  actorId: string | null;
  entity: string;
  entityId: string;
  entityName?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  before?: AnyRecord | null;
  after?: AnyRecord | null;
};

/**
 * Persists an audit record AND emits a tenant-scoped notification describing the
 * change (so it shows up in the bell). Both are scoped to tenantId, keeping the
 * same isolation as the rest of the app.
 */
export async function recordChange(input: ChangeInput): Promise<void> {
  const verb = input.action === "CREATE" ? "created" : input.action === "UPDATE" ? "updated" : "deleted";
  const labelText = input.entityName ? `${input.entity} "${input.entityName}"` : input.entity;
  const title = `${labelText} ${verb}`;
  const message = buildSummary(input, 3); // short form for the bell

  // Fire-and-forget: an audit/notification failure must not break the mutation.
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        entity: input.entity,
        entityId: input.entityId,
        entityName: input.entityName ?? null,
        action: input.action,
        before: (clean(input.before) ?? undefined) as object | undefined,
        after: (clean(input.after) ?? undefined) as object | undefined,
      },
    });
  } catch (e) {
    console.error("auditLog.create failed", e);
  }

  try {
    await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        title,
        message,
        type: ("INFO" as NotificationType) satisfies NotificationType,
      },
    });
  } catch (e) {
    console.error("audit notification.create failed", e);
  }
}

/** Build the list of human-readable field changes, ignoring system columns. */
function diffLines(input: ChangeInput): string[] {
  const before = clean(input.before);
  const after = clean(input.after);
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const lines: string[] = [];
  for (const k of keys) {
    if (IGNORE.has(k)) continue;
    const b = before[k] ?? null;
    const a = after[k] ?? null;
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    lines.push(`${label(k)}: ${formatVal(b)} → ${formatVal(a)}`);
  }
  return lines;
}

/**
 * Produce a human-readable summary of the change.
 * @param max visible field changes before truncating (0 = no cap)
 */
export function buildSummary(input: ChangeInput, max = 0): string {
  if (input.action === "CREATE") {
    const name = input.entityName ? ` "${input.entityName}"` : "";
    return `New ${input.entity.toLowerCase()}${name} was added.`;
  }
  if (input.action === "DELETE") {
    const name = input.entityName ? ` "${input.entityName}"` : "";
    return `The ${input.entity.toLowerCase()}${name} was removed.`;
  }
  const lines = diffLines(input);
  if (lines.length === 0) return `${input.entity} was updated (no field changes).`;
  const shown = max > 0 ? lines.slice(0, max) : lines;
  let summary = shown.join("; ");
  if (max > 0 && lines.length > max) summary += ` (+${lines.length - max} more)`;
  return summary;
}
