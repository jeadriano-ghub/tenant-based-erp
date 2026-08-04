import { prisma } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma";

/** Fields we never surface in an audit/notification diff. */
const SENSITIVE = new Set(["passwordHash", "password"]);

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

export type ChangeInput = {
  tenantId: string | null;
  actorId: string | null;
  entity: "Tenant" | "User" | "Role" | "Location" | "Permission";
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
  const label = input.entityName ? `${input.entity} "${input.entityName}"` : input.entity;
  const title = `${label} ${verb}`;
  const message = buildSummary(input);

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

/** Produce a short human-readable summary of changed fields. */
function buildSummary(input: ChangeInput): string {
  if (input.action === "CREATE") {
    return `New ${input.entity.toLowerCase()} was added.`;
  }
  if (input.action === "DELETE") {
    return `The ${input.entity.toLowerCase()} was removed.`;
  }
  const before = clean(input.before);
  const after = clean(input.after);
  if (!before || !after) return `${input.entity} was updated.`;
  const changed: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const b = JSON.stringify(before[k] ?? null);
    const a = JSON.stringify(after[k] ?? null);
    if (b !== a) changed.push(k);
  }
  if (changed.length === 0) return `${input.entity} was updated (no field changes).`;
  const parts = changed.slice(0, 6).map((k) => {
    const b = before[k];
    const a = after[k];
    const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "(empty)" : String(v));
    return `${k}: ${fmt(b)} → ${fmt(a)}`;
  });
  let summary = parts.join("; ");
  if (changed.length > 6) summary += ` (+${changed.length - 6} more)`;
  return summary;
}
