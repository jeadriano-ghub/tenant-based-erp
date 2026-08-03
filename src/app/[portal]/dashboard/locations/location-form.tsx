import { ActionForm, Field, Select } from "@/components/form";
import { FormSection } from "@/components/ui";
import type { ActionState } from "../actions";

const TYPES = ["BRANCH", "WAREHOUSE"] as const;

export function LocationForm({
  action, values = {}, portal, submitLabel, cancelHref, redirectOnSuccess,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values?: { id?: string; code?: string; name?: string; type?: string; address?: string | null; city?: string | null; contactNo?: string | null };
  portal: string;
  submitLabel: string;
  cancelHref: string;
  redirectOnSuccess?: string;
}) {
  return (
    <ActionForm action={action} portal={portal} submitLabel={submitLabel} cancelHref={cancelHref} redirectOnSuccess={redirectOnSuccess}>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormSection title="Location" description="Branches and warehouses users can be connected to.">
        <Field label="Code" name="code" required defaultValue={values.code} placeholder="MNL-01" hint="Short unique identifier." />
        <Field label="Name" name="name" required defaultValue={values.name} placeholder="Manila Main Branch" />
        <Select label="Type" name="type" options={TYPES} defaultValue={values.type} required />
        <Field label="Contact no." name="contactNo" type="tel" defaultValue={values.contactNo} />
        <Field label="Address" name="address" defaultValue={values.address} span />
        <Field label="City" name="city" defaultValue={values.city} />
      </FormSection>
    </ActionForm>
  );
}
