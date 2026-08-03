import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { savePermissionAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewPermissionPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const isAdminPortal = portal.isAdminPortal;
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  // Only platform administrators may extend the catalogue.
  if (!isAdminPortal || session.tenantId !== null || !can(keys, "permission.manage")) {
    redirect(`${portal.base}/dashboard/permissions`);
  }

  return (
    <div>
      <PageHeader
        title="New permission"
        description="Adds a key to the platform-wide catalogue."
        breadcrumb={{ href: `${portal.base}/dashboard/permissions`, label: "Permissions" }}
      />
      <Card>
        <ActionForm
          action={savePermissionAction}
          portal={portal.slug}
          submitLabel="Add permission"
          cancelHref={`${portal.base}/dashboard/permissions`}
          redirectOnSuccess={`${portal.base}/dashboard/permissions`}
        >
          <FormSection title="Permission" description="Keys follow a module.action convention.">
            <Field label="Key" name="key" required placeholder="inventory.transfer" hint="Lowercase, format: module.action" />
            <Field label="Module" name="module" required placeholder="Inventory" />
            <Field label="Description" name="description" span placeholder="Transfer stock between warehouses" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
