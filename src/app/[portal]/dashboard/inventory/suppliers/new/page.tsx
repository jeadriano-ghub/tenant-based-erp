import { redirect, notFound } from "next/navigation";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveSupplierAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal: slug } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.supplier.create")) redirect(`${portal.base}/dashboard/inventory/suppliers`);

  const base = portal.base;

  return (
    <div>
      <PageHeader title="New supplier" description="Add a vendor or supplier." breadcrumb={{ href: `${base}/dashboard/inventory/suppliers`, label: "Suppliers" }} />
      <Card>
        <ActionForm action={saveSupplierAction} portal={slug} submitLabel="Save supplier" cancelHref={`${base}/dashboard/inventory/suppliers`} redirectOnSuccess={`${base}/dashboard/inventory/suppliers`}>
          <FormSection title="Identity" description="Vendor name and primary contact.">
            <Field label="Name" name="name" required />
            <Field label="Contact person" name="contactPerson" />
            <Field label="Email" name="email" type="email" />
            <Field label="Contact no." name="contactNo" />
          </FormSection>
          <FormSection title="Address">
            <Field label="Address line 1" name="addressLine1" />
            <Field label="Address line 2" name="addressLine2" />
            <Field label="City" name="city" />
            <Field label="Postal code" name="postalCode" />
            <Field label="Country" name="country" defaultValue="Philippines" />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
