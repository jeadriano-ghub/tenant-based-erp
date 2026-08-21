import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveCategoryAction } from "../../../actions";
import { CategoryFields } from "../CategoryFields";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ portal: string }>;
  searchParams: Promise<{ parentId?: string }>;
}) {
  const { portal: slug } = await params;
  const { parentId } = await searchParams;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.create")) redirect(`${portal.base}/dashboard/inventory/categories`);

  const base = portal.base;
  const parents = await prisma.category.findMany({ where: { tenantId: session.tenantId!, isActive: true, parentId: null }, orderBy: { name: "asc" } } as any);
  const lockedParent = parentId ? parents.find((p: any) => (p as any).id === parentId) : null;
  const isSub = Boolean(lockedParent);

  // Subcategories can't define their own spec fields; they inherit the parent's.
  const parentOptions = isSub ? [] : (parents as any[]).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <PageHeader
        title={isSub ? `New subcategory of ${lockedParent!.name}` : "New category"}
        description={isSub ? "This will be nested under the selected main category." : "Create a product category or subcategory."}
        breadcrumb={{ href: `${base}/dashboard/inventory/categories/manage`, label: "Categories" }}
      />
      <Card>
        <ActionForm
          action={saveCategoryAction}
          portal={slug}
          submitLabel={isSub ? "Save subcategory" : "Save category"}
          cancelHref={`${base}/dashboard/inventory/categories/manage`}
          redirectOnSuccess={`${base}/dashboard/inventory/categories/manage`}
        >
          {isSub && <input type="hidden" name="parentId" value={lockedParent!.id} />}
          <FormSection title="Category" description="Name and hierarchy placement.">
            <Field label="Name" name="name" required />
            <CategoryFields
              parentOptions={parentOptions}
              defaultValueParent={lockedParent ? lockedParent.id : ""}
            />
            <Field label="Description" name="description" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
