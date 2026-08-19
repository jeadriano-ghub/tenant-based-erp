import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveCategoryAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.update")) redirect(`${portal.base}/dashboard/inventory/categories`);

  const base = portal.base;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.tenantId !== session.tenantId) notFound();

  const parents = await prisma.category.findMany({
    where: { tenantId: session.tenantId!, isActive: true, id: { not: id } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Edit category" description={category.name} breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }} />
      <Card>
        <ActionForm action={saveCategoryAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/categories/${id}`}>
          <input type="hidden" name="id" value={category.id} />
          <FormSection title="Category" description="Update name, hierarchy, and status.">
            <Field label="Name" name="name" required defaultValue={category.name} />
            <select name="parentId" defaultValue={category.parentId ?? ""} className="mt-2 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
              <option value="">—</option>
              {parents.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Field label="Description" name="description" defaultValue={category.description ?? ""} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
