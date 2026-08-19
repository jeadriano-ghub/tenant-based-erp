import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveSupplierAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: Promise<{ portal: string; id: string }> }) {
  const { portal: slug, id } = await params;
  const portal = await resolvePortal(slug);
  if (!portal) notFound();
  const { session } = await requireSession(portal);
  if (!session) redirect(`${portal.base}/login`);
  const keys = await getPermissionKeys(session.sub, session.isSuperAdmin);
  if (!can(keys, "inventory.supplier.update")) redirect(`${portal.base}/dashboard/inventory/suppliers`);

  const base = portal.base;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.tenantId !== session.tenantId) notFound();

  return (
    <div>
      <PageHeader title="Edit supplier" breadcrumb={{ href: `${base}/dashboard/inventory/suppliers`, label: "Suppliers" }} />
      <Card>
        <ActionForm action={saveSupplierAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/suppliers/${id}`}>
          <input type="hidden" name="id" value={supplier.id} />
          <FormSection title="Identity" description="Vendor name and primary contact.">
            <Field label="Name" name="name" required defaultValue={supplier.name} />
            <Field label="Contact person" name="contactPerson" defaultValue={supplier.contactPerson ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={supplier.email ?? ""} />
            <Field label="Contact no." name="contactNo" defaultValue={supplier.contactNo ?? ""} />
          </FormSection>
          <FormSection title="Address">
            <Field label="Address line 1" name="addressLine1" defaultValue={supplier.addressLine1 ?? ""} />
            <Field label="Address line 2" name="addressLine2" defaultValue={supplier.addressLine2 ?? ""} />
            <Field label="City" name="city" defaultValue={supplier.city ?? ""} />
            <Field label="Postal code" name="postalCode" defaultValue={supplier.postalCode ?? ""} />
            <Field label="Country" name="country" defaultValue={supplier.country ?? "Philippines"} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
