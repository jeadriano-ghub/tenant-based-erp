import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveCategoryAction } from "../../../actions";

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
  const parents = await prisma.category.findMany({ where: { tenantId: session.tenantId!, isActive: true }, orderBy: { name: "asc" } } as any);
  // When launched as a subcategory, the chosen parent is locked in.
  const lockedParent = parentId
    ? parents.find((p: any) => (p as any).id === parentId)
    : null;

  const isSub = Boolean(lockedParent);

  return (
    <div>
      <PageHeader
        title={isSub ? `New subcategory of ${lockedParent!.name}` : "New category"}
        description={isSub ? "This will be nested under the selected main category." : "Create a product category or subcategory."}
        breadcrumb={{ href: `${base}/dashboard/inventory/categories/manage`, label: "Manage categories" }}
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
            {isSub ? (
              <div className="rounded-lg border bg-[var(--background)] px-3 py-2.5 text-sm">
                Parent: <span className="font-medium">{lockedParent!.name}</span>
                <p className="mt-1 text-xs text-[var(--muted)]">Subcategories inherit this main category as their parent.</p>
              </div>
            ) : (
              <select
                name="parentId"
                defaultValue=""
                className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="">— No parent (main category) —</option>
                {parents.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <Field label="Description" name="description" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
