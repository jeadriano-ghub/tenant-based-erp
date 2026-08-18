import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveBrandAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewBrandPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.brand.create")) redirect(`${portal.base}/dashboard/inventory/brands`);

  const base = portal.base;

  return (
    <div>
      <PageHeader title="New brand" description="Add a manufacturer or brand." breadcrumb={{ href: `${base}/dashboard/inventory/brands`, label: "Brands" }} />
      <Card>
        <ActionForm action={saveBrandAction} portal={slug} submitLabel="Save brand" cancelHref={`${base}/dashboard/inventory/brands`} redirectOnSuccess={`${base}/dashboard/inventory/brands`}>
          <FormSection title="Brand" description="Brand identity and contact details.">
            <Field label="Name" name="name" required />
            <Field label="Website" name="website" />
            <Field label="Description" name="description" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
