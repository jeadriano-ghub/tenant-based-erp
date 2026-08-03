"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "./ui";

export type ActionState = { error?: string; success?: string; id?: string };
type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ActionForm({
  action, children, portal, submitLabel = "Save", pendingLabel = "Saving…", cancelHref, redirectOnSuccess,
}: {
  action: Action;
  children: ReactNode;
  /** Portal slug — travels with the form so the server action can re-verify it. */
  portal: string;
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
  redirectOnSuccess?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const router = useRouter();

  useEffect(() => {
    if (state?.success && redirectOnSuccess) {
      router.push(redirectOnSuccess);
      router.refresh();
    }
  }, [state, redirectOnSuccess, router]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="portal" value={portal} />
      {state?.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && !redirectOnSuccess && (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          {state.success}
        </div>
      )}

      {children}

      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-col-reverse gap-2 border-t bg-[var(--surface)]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-b-[var(--radius)] sm:px-0">
        {cancelHref && (
          <a
            href={cancelHref}
            className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-[var(--background)]"
          >
            Cancel
          </a>
        )}
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </div>
    </form>
  );
}

/* -------------------------------- fields -------------------------------- */

const controlClass =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition-shadow placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 sm:py-2";

export function Field({
  label, name, type = "text", required, defaultValue, placeholder, hint, span,
}: {
  label: string; name: string; type?: string; required?: boolean;
  defaultValue?: string | null; placeholder?: string; hint?: string; span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        defaultValue={defaultValue ?? undefined} placeholder={placeholder}
        className={controlClass}
      />
      {hint && <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function Select({
  label, name, options, defaultValue, required, hint,
}: {
  label: string; name: string; options: readonly string[];
  defaultValue?: string | null; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name} name={name} defaultValue={defaultValue ?? options[0]} required={required}
        className={controlClass}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
        ))}
      </select>
      {hint && <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function CheckboxGroup({
  name, items, selected = [], emptyText = "Nothing available yet.",
}: {
  name: string;
  items: { id: string; label: string; sub?: string; disabled?: boolean }[];
  selected?: string[];
  emptyText?: string;
}) {
  if (!items.length) return <p className="text-sm text-[var(--muted)]">{emptyText}</p>;
  return (
    <div className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
      {items.map((it) => (
        <label
          key={it.id}
          className={`flex cursor-pointer items-start gap-2.5 rounded-md p-2 transition-colors hover:bg-[var(--background)] ${
            it.disabled ? "cursor-not-allowed opacity-45" : ""
          }`}
        >
          <input
            type="checkbox" name={name} value={it.id}
            defaultChecked={selected.includes(it.id)} disabled={it.disabled}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-tight">{it.label}</span>
            {it.sub && <span className="mt-0.5 block text-xs text-[var(--muted)]">{it.sub}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function DeleteButton({
  action, id, portal, label = "Delete", confirmText = "This cannot be undone. Continue?",
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  portal: string;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="portal" value={portal} />
      <Button type="submit" variant="danger" size="sm">{label}</Button>
    </form>
  );
}
