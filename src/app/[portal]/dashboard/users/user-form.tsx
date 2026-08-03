import { ActionForm, Field, CheckboxGroup } from "@/components/form";
import { FormSection } from "@/components/ui";
import type { ActionState } from "../actions";

export type UserFormValues = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roleIds?: string[];
  locationIds?: string[];
};

export function UserForm({
  action, values = {}, portal, submitLabel, cancelHref, redirectOnSuccess,
  roles, locations, isAdminPortal, isEdit,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values?: UserFormValues;
  portal: string;
  submitLabel: string;
  cancelHref: string;
  redirectOnSuccess?: string;
  roles: { id: string; name: string; description: string | null; permissions?: string[] }[];
  locations: { id: string; code: string; name: string; type: string }[];
  isAdminPortal: boolean;
  isEdit?: boolean;
}) {
  return (
    <ActionForm action={action} portal={portal} submitLabel={submitLabel} cancelHref={cancelHref} redirectOnSuccess={redirectOnSuccess}>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormSection
        title="Profile"
        description={
          isAdminPortal
            ? "Platform administrators have no tenant and sign in only on the admin portal."
            : "This user belongs to your workspace."
        }
      >
        <Field label="First name" name="firstName" required defaultValue={values.firstName} />
        <Field label="Last name" name="lastName" required defaultValue={values.lastName} />
        <Field label="Email" name="email" type="email" required defaultValue={values.email} span />
        <Field
          label="Password"
          name="password"
          type="password"
          required={!isEdit}
          hint={
            isEdit
              ? "Leave blank to keep the current password."
              : "Min 10 characters with uppercase, lowercase, a number and a special character."
          }
          span
        />
      </FormSection>

      <FormSection title="Roles" description="Roles bundle the permissions this user will have.">
        <div className="sm:col-span-2">
          <CheckboxGroup
            name="roleIds"
            selected={values.roleIds}
            items={roles.map((r) => ({ id: r.id, label: r.name, sub: r.description ?? undefined, hint: r.permissions?.length ? r.permissions.join(", ") : undefined }))}
            emptyText="No roles defined yet. Create a role first."
          />
        </div>
      </FormSection>

      {!isAdminPortal && (
        <FormSection title="Branch / Warehouse" description="Locations this user can operate in. The first selected becomes primary.">
          <div className="sm:col-span-2">
            <CheckboxGroup
              name="locationIds"
              selected={values.locationIds}
              items={locations.map((l) => ({ id: l.id, label: `${l.code} — ${l.name}`, sub: l.type }))}
              emptyText="No branches or warehouses yet. Create one first."
            />
          </div>
        </FormSection>
      )}
    </ActionForm>
  );
}
