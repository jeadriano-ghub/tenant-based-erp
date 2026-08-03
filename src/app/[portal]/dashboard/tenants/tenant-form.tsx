import { ActionForm, Field, Select } from "@/components/form";
import { FormSection } from "@/components/ui";
import { ROOT_DOMAIN } from "@/lib/tenant";
import type { ActionState } from "../actions";

const TYPES = ["CORPORATE", "SME", "ENTERPRISE", "GOVERNMENT", "NONPROFIT"] as const;
const CYCLES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;
const METHODS = ["CREDIT_CARD", "BANK_TRANSFER", "GCASH", "MAYA", "CHECK", "CASH"] as const;
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"] as const;

export type TenantFormValues = {
  id?: string;
  name?: string; logoUrl?: string | null; subdomain?: string; type?: string;
  contactPerson?: string; email?: string; contactNo?: string;
  companyName?: string; industry?: string; tin?: string | null; businessRegNo?: string | null;
  website?: string | null; addressLine1?: string | null; addressLine2?: string | null;
  city?: string | null; stateProvince?: string | null; postalCode?: string | null; country?: string | null;
  subscriptionStart?: Date | null; subscriptionEnd?: Date | null;
  billingCycle?: string; paymentMethod?: string; status?: string;
};

const d = (v?: Date | null) => (v ? v.toISOString().slice(0, 10) : "");

export function TenantForm({
  action, values = {}, portal, submitLabel, cancelHref, redirectOnSuccess,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values?: TenantFormValues;
  portal: string;
  submitLabel: string;
  cancelHref: string;
  redirectOnSuccess?: string;
}) {
  return (
    <ActionForm
      action={action}
      portal={portal}
      submitLabel={submitLabel}
      cancelHref={cancelHref}
      redirectOnSuccess={redirectOnSuccess}
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormSection title="Identity" description="How the tenant appears and the URL where their workspace lives.">
        <Field label="Tenant name" name="name" required defaultValue={values.name} placeholder="Acme Retail Corp" />
        <Field
          label="Tenant URL" name="subdomain" required defaultValue={values.subdomain}
          placeholder="acme" hint={`3-63 chars · a-z, 0-9, hyphens · ${ROOT_DOMAIN}/[tenant]`}
        />
        <Field label="Logo URL" name="logoUrl" defaultValue={values.logoUrl} placeholder="https://…/logo.png" span />
        <Select label="Tenant type" name="type" options={TYPES} defaultValue={values.type} required />
        <Select label="Status" name="status" options={STATUSES} defaultValue={values.status} required />
      </FormSection>

      <FormSection title="Contact" description="Primary point of contact for this account.">
        <Field label="Contact person" name="contactPerson" required defaultValue={values.contactPerson} />
        <Field label="Email address" name="email" type="email" required defaultValue={values.email} />
        <Field label="Contact no." name="contactNo" type="tel" required defaultValue={values.contactNo} placeholder="+63 917 000 0000" />
      </FormSection>

      <FormSection title="Company" description="Legal and registration details.">
        <Field label="Company name" name="companyName" required defaultValue={values.companyName} />
        <Field label="Industry" name="industry" required defaultValue={values.industry} placeholder="Retail" />
        <Field label="TIN" name="tin" defaultValue={values.tin} placeholder="000-000-000-000" />
        <Field label="Business registration no." name="businessRegNo" defaultValue={values.businessRegNo} />
        <Field label="Website" name="website" defaultValue={values.website} placeholder="https://acme.com" span />
      </FormSection>

      <FormSection title="Address">
        <Field label="Address line 1" name="addressLine1" defaultValue={values.addressLine1} span />
        <Field label="Address line 2" name="addressLine2" defaultValue={values.addressLine2} span />
        <Field label="City" name="city" defaultValue={values.city} />
        <Field label="State / Province" name="stateProvince" defaultValue={values.stateProvince} />
        <Field label="Postal code" name="postalCode" defaultValue={values.postalCode} />
        <Field label="Country" name="country" defaultValue={values.country ?? "Philippines"} />
      </FormSection>

      <FormSection title="Subscription & billing">
        <Field label="Subscription start" name="subscriptionStart" type="date" defaultValue={d(values.subscriptionStart)} />
        <Field label="Subscription end" name="subscriptionEnd" type="date" defaultValue={d(values.subscriptionEnd)} />
        <Select label="Billing cycle" name="billingCycle" options={CYCLES} defaultValue={values.billingCycle} required />
        <Select label="Payment method" name="paymentMethod" options={METHODS} defaultValue={values.paymentMethod} required />
      </FormSection>
    </ActionForm>
  );
}
