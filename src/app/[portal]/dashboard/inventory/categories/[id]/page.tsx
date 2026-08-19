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
  const category = await prisma.category.findUnique({ where: { id }, include: { parent: true } });
  if (!category || category.tenantId !== session.tenantId) notFound();

  const canEdit = can(keys, "inventory.category.update");
  const canDelete = can(keys, "inventory.category.delete");

  return (
    <div className="space-y-5">
      <PageHeader
        title={category.name}
        description={category.description ?? undefined}
        breadcrumb={{ href: `${base}/dashboard/inventory/categories`, label: "Categories" }}
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
            { label: "Parent", value: category.parent?.name || "—" },
            { label: "Status", value: <Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Badge> },
            { label: "Created", value: category.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>
    </div>
  );
}
