import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteCategoryAction } from "../../../actions";

export const dynamic = "force-dynamic";

type Cat = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  tenantId: string;
  createdAt: Date;
  fields?: any;
};

export default async function CategoryDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const category = await prisma.category.findUnique({ where: { id } } as any) as Cat | null;
  if (!category || category.tenantId !== session.tenantId) notFound();
  const parent = category.parentId ? ((await prisma.category.findUnique({ where: { id: category.parentId } })) as Cat | null) : null;
  const isSub = Boolean(category.parentId);
  const canEdit = can(keys, "inventory.category.update");
  const canDelete = can(keys, "inventory.category.delete");
  const canViewProducts = can(keys, "inventory.product.view");

  // Subcategories (only for main categories)
  const subcategories = isSub
    ? []
    : ((await prisma.category.findMany({
        where: { tenantId: session.tenantId!, parentId: id },
        orderBy: { name: "asc" },
      })) as Cat[]);
  const hasSubcategories = subcategories.length > 0;

  // Products in this category
  const products = canViewProducts
    ? await prisma.product.findMany({
        where: { tenantId: session.tenantId!, categoryId: id },
        orderBy: { name: "asc" },
      } as any)
    : [];

  // Spec field definitions (for subcategories)
  const specFields: any[] = isSub && Array.isArray(category.fields) ? category.fields : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={category.name}
        description={category.description ?? undefined}
        action={
          <div className="flex gap-2">
            {canEdit && <LinkButton href={`${base}/dashboard/inventory/categories/${category.id}/edit`}>Edit</LinkButton>}
            {canDelete && (
              <DeleteButton action={deleteCategoryAction} portal={portal.slug} id={category.id} confirmText={`Delete category "${category.name}"?`} />
            )}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Name", value: category.name },
            { label: "Parent", value: parent?.name || (isSub ? "—" : "Main category") },
            { label: "Status", value: <Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Badge> },
            { label: "Created", value: category.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>

      {/* Subcategories — only for main categories */}
      {!isSub && (
        <Card
          title="Subcategories"
          description={hasSubcategories ? "Categories nested under this one." : "No subcategories yet."}
          footer={
            canEdit ? (
              <LinkButton href={`${base}/dashboard/inventory/categories/new?parentId=${category.id}`} variant="secondary" size="sm">
                + Add subcategory
              </LinkButton>
            ) : undefined
          }
        >
          {hasSubcategories ? (
            <ul className="grid gap-2">
              {subcategories.map((s) => (
                <li key={s.id}>
                  <LinkButton variant="ghost" href={`${base}/dashboard/inventory/categories/${s.id}`} className="!px-0 !text-sm !font-medium">
                    {s.name}
                  </LinkButton>
                  {s.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{s.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">No subcategories yet.</p>
          )}
        </Card>
      )}

      {/* Custom specification fields — for subcategories */}
      {isSub && (
        <Card title="Custom fields" description="Specification fields defined for this subcategory (shown when creating a product here).">
          {specFields.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No custom fields defined.</p>
          ) : (
            <ul className="divide-y">
              {specFields.map((f: any, i: number) => (
                <li key={f.key || i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{f.label || f.key}</span>
                    <span className="ml-2 text-xs text-[var(--muted)]">{f.key}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Badge tone="neutral">{f.type}</Badge>
                    {f.required && <Badge tone="warning">Required</Badge>}
                    <Badge tone={f.status === "active" ? "success" : f.status === "disabled" ? "neutral" : "danger"}>{f.status || "active"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Products in this category */}
      {canViewProducts && (
        <Card
          title="Products"
          description={products.length ? `${products.length} product(s) in this category.` : "No products in this category yet."}
          footer={
            can(keys, "inventory.product.create") ? (
              <LinkButton href={`${base}/dashboard/inventory/products/new`} variant="secondary" size="sm">
                + Add product
              </LinkButton>
            ) : undefined
          }
        >
          {products.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No products yet.</p>
          ) : (
            <ul className="divide-y">
              {products.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <LinkButton variant="ghost" href={`${base}/dashboard/inventory/products/${p.id}/edit`} className="!px-0 !text-sm !font-medium">
                    {p.name} {p.sku ? `(${p.sku})` : ""}
                  </LinkButton>
                  <span className="text-xs text-[var(--muted)]">
                    {p.sellingPrice ? `₱${Number(p.sellingPrice).toFixed(2)}` : "—"}
                    {p.unitOfMeasure ? ` / ${p.unitOfMeasure}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
