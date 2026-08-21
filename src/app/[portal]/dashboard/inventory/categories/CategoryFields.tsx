"use client";

import { useMemo, useState } from "react";
import { controlClass } from "@/components/form";

export type CategorySpecFieldStatus = "active" | "disabled" | "hidden";

export type CategorySpecField = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "select";
  required: boolean;
  options: string; // comma-separated, only for select
  status: CategorySpecFieldStatus;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function CategoryFields({
  parentOptions,
  defaultValueParent,
  parentName,
  parentLockedHint,
  initialFields,
}: {
  parentOptions: { id: string; name: string }[];
  defaultValueParent?: string | null;
  parentName?: string | null;
  parentLockedHint?: string | null;
  initialFields?: CategorySpecField[];
}) {
  const [fields, setFields] = useState<CategorySpecField[]>(
    initialFields && initialFields.length ? initialFields : [],
  );
  const [parentId, setParentId] = useState<string>(defaultValueParent ?? "");
  const isSubcategory = Boolean(parentId);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const update = (id: string, key: keyof CategorySpecField, val: string | boolean) =>
    setFields((arr) => arr.map((f) => (f.id === id ? { ...f, [key]: val } : f)));

  const remove = (id: string) => setFields((arr) => arr.filter((f) => f.id !== id));

  const onDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setFields((arr) => {
      const next = [...arr];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  const fieldsJson = useMemo(() => {
    const cleaned = fields
      .filter((f) => f.label && f.key)
      .map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: f.type === "select" ? f.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
        status: f.status,
      }));
    return JSON.stringify(cleaned);
  }, [fields]);

  return (
    <>
      <input type="hidden" name="fieldsJson" value={fieldsJson} />

      {/* Category parent — uniform dropdown */}
      {parentOptions.length === 0 ? (
        <div className="rounded-lg border bg-[var(--background)] px-3 py-2.5 text-sm">
          Parent: <span className="font-medium">{parentName || (defaultValueParent ? "Locked" : "— (main category)")}</span>
          {defaultValueParent && (
            <p className="mt-1 text-xs text-[var(--muted)]">{parentLockedHint || "This is a subcategory; its parent cannot be changed here."}</p>
          )}
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Parent category</label>
          <select
            name="parentId"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={controlClass}
          >
            <option value="">— (main category)</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Custom specification fields — only for subcategories */}
      {isSubcategory ? (
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Specification fields</p>
              <p className="text-xs text-[var(--muted)]">
                Define fields (e.g. size, color, wattage) shown when creating a product in this subcategory. Drag the handle to reorder.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFields((a) => [
                  ...a,
                  { id: uid(), key: "", label: "", type: "text", required: false, options: "", status: "active" },
                ])
              }
              className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]"
            >
              + Add field
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-[var(--muted)]">
              No custom fields. Products in this subcategory will only use the standard attributes.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_1.2fr_0.9fr_0.7fr_1.4fr_0.9fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                <span />
                <span>Key (field id)</span>
                <span>Label</span>
                <span>Type</span>
                <span>Required</span>
                <span>Options (comma sep.)</span>
                <span>Status</span>
                <span />
              </div>
              {fields.map((f, index) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={() => onDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={`grid grid-cols-[auto_1fr_1.2fr_0.9fr_0.7fr_1.4fr_0.9fr_auto] items-center gap-2 rounded-md px-1 ${
                    overIndex === index && dragIndex !== null ? "ring-2 ring-[var(--brand)]" : ""
                  } ${dragIndex === index ? "opacity-50" : ""}`}
                >
                  <span className="cursor-grab select-none text-lg leading-none text-[var(--muted)]" title="Drag to reorder">⠿</span>
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
                  <select
                    value={f.status}
                    onChange={(e) => update(f.id, "status", e.target.value as CategorySpecFieldStatus)}
                    className={controlClass}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="hidden">Hidden</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    className="rounded-md border px-2 py-2 text-xs text-red-500"
                    aria-label="Remove field"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="sm:col-span-2 rounded-lg border border-dashed px-3 py-3 text-xs text-[var(--muted)]">
          Select a parent category above to make this a subcategory. Specification fields are defined on subcategories only.
        </div>
      )}
    </>
  );
}
