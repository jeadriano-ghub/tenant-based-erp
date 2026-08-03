import { ActionForm, Field, CheckboxGroup } from "@/components/form";
import { FormSection } from "@/components/ui";
import { PLATFORM_ONLY_KEYS } from "@/lib/permissions";
import type { ActionState } from "../actions";

export function RoleForm({
  action, values = {}, portal, submitLabel, cancelHref, redirectOnSuccess, permissions, isAdminPortal,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values?: { id?: string; name?: string; description?: string | null; permissionIds?: string[] };
  portal: string;
  submitLabel: string;
  cancelHref: string;
  redirectOnSuccess?: string;
  permissions: { id: string; key: string; module: string; description: string | null }[];
  isAdminPortal: boolean;
}) {
  return (
    <ActionForm action={action} portal={portal} submitLabel={submitLabel} cancelHref={cancelHref} redirectOnSuccess={redirectOnSuccess}>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormSection title="Role" description="Give the role a clear, recognisable name.">
        <Field label="Role name" name="name" required defaultValue={values.name} placeholder="Branch Manager" />
        <Field label="Description" name="description" defaultValue={values.description} placeholder="Manages a single branch" />
      </FormSection>

      <FormSection
        title="Permissions"
        description={
          isAdminPortal
            ? "Select the permissions this role grants."
            : "Combine permissions into this role. Platform-only permissions cannot be selected."
        }
      >
        <div className="sm:col-span-2">
          <CheckboxGroup
            name="permissionIds"
            selected={values.permissionIds}
            items={permissions.map((p) => ({
              id: p.id,
              label: p.key,
              sub: `${p.module}${p.description ? " · " + p.description : ""}`,
              disabled: !isAdminPortal && PLATFORM_ONLY_KEYS.has(p.key),
            }))}
          />
        </div>
      </FormSection>
    </ActionForm>
  );
}
