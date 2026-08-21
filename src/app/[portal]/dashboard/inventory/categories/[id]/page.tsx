import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteCategoryAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.category.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: { orderBy: { name: "asc" } } },
  } as any);
  const parent = category?.parentId ? await prisma.category.findUnique({ where: { id: category.parentId } }) : null;
  const safeCategory = category ? { ...category, parent } : null;
  if (!safeCategory || safeCategory.tenantId !== session.tenantId) notFound();
  const subcategories = (safeCategory as any).children ?? [];

  const canEdit = can(keys, "inventory.category.update");
  const canDelete = can(keys, "inventory.category.delete");

  if (!safeCategory) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={safeCategory.name}
        description={safeCategory.description ?? undefined}
        breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }}
        action={
          <div className="flex gap-2">
            {canEdit && <LinkButton href={`${base}/dashboard/inventory/categories/${safeCategory.id}/edit`}>Edit</LinkButton>}
            {canDelete && (
              <DeleteButton action={deleteCategoryAction} portal={portal.slug} id={safeCategory.id} confirmText={`Delete category "${safeCategory.name}"?`} />
            )}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Name", value: safeCategory.name },
            { label: "Parent", value: (safeCategory as any).parent?.name || "—" },
            { label: "Status", value: <Badge tone={safeCategory.isActive ? "success" : "neutral"}>{safeCategory.isActive ? "Active" : "Inactive"}</Badge> },
            { label: "Created", value: safeCategory.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>

      <Card
        title="Subcategories"
        description={subcategories.length ? "Nested categories under this one." : "No subcategories yet."}
        footer={
          canEdit && !safeCategory.parentId ? (
            <LinkButton href={`${base}/dashboard/inventory/categories/new?parentId=${safeCategory.id}`} variant="secondary" size="sm">
              + Add subcategory
            </LinkButton>
          ) : undefined
        }
      >
        {subcategories.length > 0 && (
          <ul className="grid gap-2">
            {subcategories.map((s: any) => (
              <li key={s.id}>
                <LinkButton
                  variant="ghost"
                  href={`${base}/dashboard/inventory/categories/${s.id}`}
                  className="!px-0 !text-sm !font-medium"
                >
                  {s.name}
                </LinkButton>
                {s.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
