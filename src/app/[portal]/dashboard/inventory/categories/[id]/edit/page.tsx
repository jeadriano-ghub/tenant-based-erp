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
      status: (f.status === "disabled" || f.status === "hidden") ? f.status : "active",
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

  const initialFields = parseFields(category.fields);
  // Subcategories keep their parent (it can't be changed here), so prefill it as a locked parent.
  const isSub = Boolean(category.parentId);
  const parentOptions = isSub
    ? [] // no reparenting; parent is locked
    : await prisma.category.findMany({
        where: { tenantId: session.tenantId!, isActive: true, parentId: null, id: { not: id } },
        orderBy: { name: "asc" },
      } as any);
  const parentName = category.parentId
    ? await prisma.category.findUnique({ where: { id: category.parentId } } as any).then((p: any) => p?.name ?? null)
    : null;

  return (
    <div>
      <PageHeader title="Edit category" description={category.name} breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }} />
      <Card>
        <ActionForm action={saveCategoryAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/categories/${id}`}>
          <input type="hidden" name="id" value={category.id} />
          {isSub && <input type="hidden" name="parentId" value={category.parentId ?? ""} />}
          <FormSection title="Category" description="Update name, hierarchy, and status.">
            <Field label="Name" name="name" required defaultValue={category.name} />
            <CategoryFields
              parentOptions={parentOptions as any[]}
              defaultValueParent={category.parentId ?? ""}
              parentName={parentName}
              initialFields={initialFields}
            />
            <Field label="Description" name="description" defaultValue={category.description ?? ""} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
