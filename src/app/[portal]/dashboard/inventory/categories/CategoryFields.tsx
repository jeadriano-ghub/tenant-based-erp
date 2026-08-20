"use client";

import { useMemo, useState } from "react";
import { controlClass } from "@/components/form";

export type CategorySpecField = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "select";
  required: boolean;
  options: string; // comma-separated, only for select
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function CategoryFields({
  parentOptions,
  defaultValueParent,
  initialFields,
}: {
  parentOptions: { id: string; name: string }[];
  defaultValueParent?: string | null;
  initialFields?: CategorySpecField[];
}) {
  const [fields, setFields] = useState<CategorySpecField[]>(
    initialFields && initialFields.length
      ? initialFields
      : [],
  );

  const update = (id: string, key: keyof CategorySpecField, val: string | boolean) =>
    setFields((arr) => arr.map((f) => (f.id === id ? { ...f, [key]: val } : f)));

  const move = (index: number, dir: -1 | 1) =>
    setFields((arr) => {
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      const next = [...arr];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const fieldsJson = useMemo(() => {
    const cleaned = fields
      .filter((f) => f.label && f.key)
      .map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: f.type === "select" ? f.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      }));
    return JSON.stringify(cleaned);
  }, [fields]);

  return (
    <>
      <input type="hidden" name="fieldsJson" value={fieldsJson} />

      {/* Category parent — uniform dropdown */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Parent category</label>
        <select
          name="parentId"
          defaultValue={defaultValueParent ?? ""}
          className={controlClass}
        >
          <option value="">— (main category)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Custom specification fields */}
      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Specification fields</p>
            <p className="text-xs text-[var(--muted)]">
              Define fields (e.g. size, color, wattage) shown when creating a product in this category.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFields((a) => [...a, { id: uid(), key: "", label: "", type: "text", required: false, options: "" }])}
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]"
          >
            + Add field
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-[var(--muted)]">
            No custom fields. Products in this category will only use the standard attributes.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1.2fr_0.9fr_0.7fr_1.4fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              <span>Key (field id)</span>
              <span>Label</span>
              <span>Type</span>
              <span>Required</span>
              <span>Options (comma sep.)</span>
              <span>Sort</span>
            </div>
            {fields.map((f, index) => (
              <div key={f.id} className="grid grid-cols-[1fr_1.2fr_0.9fr_0.7fr_1.4fr_auto] items-center gap-2">
                <input
                  value={f.key}
                  onChange={(e) => update(f.id, "key", e.target.value)}
                  placeholder="size"
                  className={controlClass}
                />
                <input
                  value={f.label}
                  onChange={(e) => update(f.id, "label", e.target.value)}
                  placeholder="Size"
                  className={controlClass}
                />
                <select
                  value={f.type}
                  onChange={(e) => update(f.id, "type", e.target.value as CategorySpecField["type"])}
                  className={controlClass}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                </select>
                <label className="flex items-center justify-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => update(f.id, "required", e.target.checked)}
                    className="accent-[var(--brand)]"
                  />
                  Yes
                </label>
                <input
                  value={f.options}
                  onChange={(e) => update(f.id, "options", e.target.value)}
                  placeholder={f.type === "select" ? "S, M, L, XL" : "—"}
                  disabled={f.type !== "select"}
                  className={`${controlClass} disabled:opacity-50`}
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="rounded-md border px-1.5 py-1 text-xs disabled:opacity-30 hover:bg-[var(--background)]"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === fields.length - 1}
                    aria-label="Move down"
                    className="rounded-md border px-1.5 py-1 text-xs disabled:opacity-30 hover:bg-[var(--background)]"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setFields((a) => a.filter((x) => x.id !== f.id))}
                    className="rounded-md border px-2 py-2 text-xs text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
