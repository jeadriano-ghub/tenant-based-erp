"use client";

import { useActionState } from "react";
import type { ActionState } from "./actions";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</div>
      )}
      {children}
      <button
        type="submit" disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export function Field({
  label, name, type = "text", required, defaultValue, placeholder, hint,
}: {
  label: string; name: string; type?: string; required?: boolean;
  defaultValue?: string | null; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-slate-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        defaultValue={defaultValue ?? undefined} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
      />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function Select({
  label, name, options, defaultValue, required,
}: {
  label: string; name: string; options: readonly string[];
  defaultValue?: string | null; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-slate-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <select
        id={name} name={name} defaultValue={defaultValue ?? options[0]} required={required}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxGroup({
  name, items, selected = [],
}: {
  name: string;
  items: { id: string; label: string; sub?: string; disabled?: boolean }[];
  selected?: string[];
}) {
  if (!items.length) return <p className="text-xs text-slate-500">Nothing available yet.</p>;
  return (
    <div className="grid max-h-64 gap-1 overflow-y-auto rounded-md border border-slate-200 p-3 sm:grid-cols-2">
      {items.map((it) => (
        <label key={it.id} className={`flex items-start gap-2 text-sm ${it.disabled ? "opacity-40" : ""}`}>
          <input
            type="checkbox" name={name} value={it.id}
            defaultChecked={selected.includes(it.id)} disabled={it.disabled}
            className="mt-0.5"
          />
          <span>
            <span className="text-slate-800">{it.label}</span>
            {it.sub && <span className="block text-[11px] text-slate-500">{it.sub}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
