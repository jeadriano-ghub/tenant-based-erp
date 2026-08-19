import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection, Badge, LinkButton, DescriptionList } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveBrandAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditBrandPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.brand.update")) redirect(`${portal.base}/dashboard/inventory/brands`);

  const base = portal.base;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand || brand.tenantId !== session.tenantId) notFound();

  return (
    <div>
      <PageHeader title="Edit brand" description={brand.name} breadcrumb={{ href: `${base}/dashboard/inventory/brands`, label: "Brands" }} />
      <Card>
        <ActionForm action={saveBrandAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/brands/${id}`}>
          <input type="hidden" name="id" value={brand.id} />
          <FormSection title="Brand" description="Update brand identity.">
            <Field label="Name" name="name" required defaultValue={brand.name} />
            <Field label="Website" name="website" defaultValue={brand.website ?? ""} />
            <Field label="Description" name="description" defaultValue={brand.description ?? ""} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
