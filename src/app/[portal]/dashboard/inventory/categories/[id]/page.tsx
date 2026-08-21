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
  } as any);
  const parent = category?.parentId ? await prisma.category.findUnique({ where: { id: category.parentId } }) : null;
  const safeCategory = category ? { ...category, parent } : null;
  if (!safeCategory || safeCategory.tenantId !== session.tenantId) notFound();
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
    </div>
  );
}
