import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveCategoryAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.create")) redirect(`${portal.base}/dashboard/inventory/categories`);

  const base = portal.base;
  const parents = await prisma.category.findMany({ where: { tenantId: session.tenantId!, isActive: true }, orderBy: { name: "asc" } } as any);

  return (
    <div>
      <PageHeader title="New category" description="Create a product category or subcategory." breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }} />
      <Card>
        <ActionForm action={saveCategoryAction} portal={slug} submitLabel="Save category" cancelHref={`${base}/dashboard/inventory/categories`} redirectOnSuccess={`${base}/dashboard/inventory/categories`}>
          <FormSection title="Category" description="Name and hierarchy placement.">
            <Field label="Name" name="name" required />
            <select name="parentId" className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm">
              <option value="">—</option>
              {parents.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Field label="Description" name="description" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
