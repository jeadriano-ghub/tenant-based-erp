import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveCategoryAction } from "../../../../actions";
import { CategoryFields, type CategorySpecField } from "../../CategoryFields";

export const dynamic = "force-dynamic";

function parseFields(raw: unknown): CategorySpecField[] {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr.map((f: any, i: number) => ({
      id: String(f.id ?? `f${i}_${Math.random().toString(36).slice(2, 7)}`),
      key: f.key ?? "",
      label: f.label ?? "",
      type: (f.type === "select" || f.type === "number") ? f.type : "text",
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.join(", ") : (f.options ?? ""),
    }));
  } catch {
    return [];
  }
}

export default async function EditCategoryPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.update")) redirect(`${portal.base}/dashboard/inventory/categories`);

  const base = portal.base;
  const category = await prisma.category.findUnique({ where: { id } } as any);
  if (!category || category.tenantId !== session.tenantId) notFound();

  // Subcategories inherit parent fields; only edit parent + specs on main categories.
  const isSub = Boolean(category.parentId);
  const parents = isSub
    ? []
    : await prisma.category.findMany({
        where: { tenantId: session.tenantId!, isActive: true, id: { not: id } },
        orderBy: { name: "asc" },
      });

  const initialFields = parseFields(category.fields);

  return (
    <div>
      <PageHeader title="Edit category" description={category.name} breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }} />
      <Card>
        <ActionForm action={saveCategoryAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/categories/${id}`}>
          <input type="hidden" name="id" value={category.id} />
          <FormSection title="Category" description="Update name, hierarchy, and status.">
            <Field label="Name" name="name" required defaultValue={category.name} />
            {isSub ? (
              <div className="rounded-lg border bg-[var(--background)] px-3 py-2.5 text-sm">
                Parent: <span className="font-medium">{category.parentId}</span>
                <p className="mt-1 text-xs text-[var(--muted)]">Subcategories inherit their parent&rsquo;s specification fields.</p>
              </div>
            ) : (
              <CategoryFields
                parentOptions={(parents as any[]).map((p) => ({ id: p.id, name: p.name }))}
                defaultValueParent={category.parentId ?? ""}
                initialFields={initialFields}
              />
            )}
            <Field label="Description" name="description" defaultValue={category.description ?? ""} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
