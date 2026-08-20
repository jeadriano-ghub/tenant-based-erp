import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, getPermissionKeys, can, resolvePortal } from "@/lib/auth";
import { PageHeader, Card, FormSection } from "@/components/ui";
import { ActionForm, Field } from "@/components/form";
import { saveSupplierAction } from "../../../../actions";
import { SupplierBusinesses, type SupplierBusinessInput } from "../../SupplierBusinesses";

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
  const supplier: any = await prisma.supplier.findUnique({
    where: { id },
    include: { businesses: { orderBy: { createdAt: "asc" } } },
  } as any);
  if (!supplier || supplier.tenantId !== session.tenantId) notFound();

  const initialBusinesses: SupplierBusinessInput[] = (supplier.businesses ?? []).map((b: any) => ({
    businessName: b.businessName,
    tin: b.tin ?? "",
    businessRegNo: b.businessRegNo ?? "",
    isPrimary: Boolean(b.isPrimary),
  }));

  return (
    <div>
      <PageHeader title="Edit supplier" breadcrumb={{ href: `${base}/dashboard/inventory/suppliers`, label: "Suppliers" }} />
      <Card>
        <ActionForm action={saveSupplierAction} portal={slug} submitLabel="Save changes" redirectOnSuccess={`${base}/dashboard/inventory/suppliers/${id}`}>
          <input type="hidden" name="id" value={supplier.id} />
          <FormSection title="Identity" description="Supplier name is the display alias; trading names live under Business details.">
            <Field label="Supplier name (alias)" name="name" required defaultValue={supplier.name} />
            <Field label="Contact person" name="contactPerson" defaultValue={supplier.contactPerson ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={supplier.email ?? ""} />
            <Field label="Contact no." name="contactNo" defaultValue={supplier.contactNo ?? ""} />
          </FormSection>
          <FormSection title="Business details" description="A supplier can trade under multiple business names / TINs.">
            <Field label="Payment terms (days)" name="termsDays" type="number" defaultValue={String(supplier.termsDays ?? 30)} hint="Net payment term applied to new purchase orders." />
            <SupplierBusinesses initial={initialBusinesses} />
          </FormSection>
          <FormSection title="Address">
            <Field label="Address line 1" name="addressLine1" defaultValue={supplier.addressLine1 ?? ""} />
            <Field label="Address line 2" name="addressLine2" defaultValue={supplier.addressLine2 ?? ""} />
            <Field label="City" name="city" defaultValue={supplier.city ?? ""} />
            <Field label="Postal code" name="postalCode" defaultValue={supplier.postalCode ?? ""} />
            <Field label="Country" name="country" defaultValue={supplier.country ?? "Philippines"} />
            <Field label="Notes" name="notes" defaultValue={supplier.notes ?? ""} />
          </FormSection>
        </ActionForm>
      </Card>
    </div>
  );
}
