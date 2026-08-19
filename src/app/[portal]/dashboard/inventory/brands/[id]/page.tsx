import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { DeleteButton } from "@/components/form";
import { deleteBrandAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.brand.view")) redirect(`${portal.base}/dashboard/inventory`);

  const base = portal.base;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand || brand.tenantId !== session.tenantId) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={brand.name}
        description={brand.description ?? undefined}
        breadcrumb={{ href: `${base}/dashboard/inventory/brands`, label: "Brands" }}
        action={
          <div className="flex gap-2">
            {can(keys, "inventory.brand.update") && <LinkButton href={`${base}/dashboard/inventory/brands/${brand.id}/edit`}>Edit</LinkButton>}
            {can(keys, "inventory.brand.delete") && (
              <DeleteButton action={deleteBrandAction} portal={portal.slug} id={brand.id} confirmText={`Delete brand "${brand.name}"?`} />
            )}
          </div>
        }
      />
      <Card title="Details">
        <DescriptionList
          items={[
            { label: "Name", value: brand.name },
            { label: "Website", value: brand.website || "—" },
            { label: "Status", value: <Badge tone={brand.isActive ? "success" : "neutral"}>{brand.isActive ? "Active" : "Inactive"}</Badge> },
            { label: "Created", value: brand.createdAt.toISOString().slice(0, 10) },
          ]}
        />
      </Card>
    </div>
  );
}
