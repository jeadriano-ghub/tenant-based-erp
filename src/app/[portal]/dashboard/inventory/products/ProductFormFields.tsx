"use client";

import { useMemo, useState } from "react";
import { Field, controlClass } from "@/components/form";

export type PriceTier = { id: string; name: string; price: string; minQty: string };
export type BarcodeRow = { id: string; barcode: string; format: string; isPrimary: boolean };

export type CategoryOption = {
  id: string;
  name: string;
  parentId?: string | null;
  fields?: { key: string; label: string; type: "text" | "number" | "select"; required?: boolean; options?: string[]; status?: "active" | "disabled" | "hidden" }[] | null;
};

const TYPE_LABELS: Record<string, string> = {
  SERIALIZED: "Serialized",
  NON_SERIALIZED: "Non-serialized",
  BARCODE: "Barcode",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function ProductFormFields({
  productType,
  costPrice,
  sellingPrice,
  initialPrices,
  initialBarcodes,
  categoryOptions = [],
  brandOptions = [],
  defaultCategoryId,
  defaultBrandId,
}: {
  productType: string;
  costPrice?: string | null;
  sellingPrice?: string | null;
  initialPrices?: PriceTier[];
  initialBarcodes?: BarcodeRow[];
  categoryOptions?: CategoryOption[];
  brandOptions?: { id: string; name: string }[];
  defaultCategoryId?: string | null;
  defaultBrandId?: string | null;
}) {
  const [type, setType] = useState<string>(productType || "NON_SERIALIZED");
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId ?? "");
  const [prices, setPrices] = useState<PriceTier[]>(
    initialPrices && initialPrices.length ? initialPrices : [{ id: uid(), name: "Default", price: "", minQty: "" }],
  );
  const [barcodes, setBarcodes] = useState<BarcodeRow[]>(
    initialBarcodes && initialBarcodes.length ? initialBarcodes : [{ id: uid(), barcode: "", format: "CODE128", isPrimary: true }],
  );

  const selectedCategory = categoryOptions.find((c) => c.id === categoryId);
  const specFields = selectedCategory?.fields ?? [];

  // spec field values keyed by field key
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const updateSpec = (key: string, val: string) =>
    setSpecValues((prev) => ({ ...prev, [key]: val }));
  const specJson = useMemo(() => {
    const entries = specFields
      .map((f) => ({ key: f.key, value: specValues[f.key] ?? "" }))
      .filter((e) => e.value !== "");
    return JSON.stringify(entries);
  }, [specFields, specValues]);

  const updatePrice = (id: string, key: keyof PriceTier, val: string) =>
    setPrices((arr) => arr.map((p) => (p.id === id ? { ...p, [key]: val } : p)));
  const updateBarcode = (id: string, key: keyof BarcodeRow, val: string | boolean) =>
    setBarcodes((arr) =>
      arr.map((b) =>
        b.id === id
          ? { ...b, [key]: key === "isPrimary" ? Boolean(val) : (val as string) }
          : b,
      ),
    );
  const setPrimaryBarcode = (id: string) =>
    setBarcodes((arr) => arr.map((b) => ({ ...b, isPrimary: b.id === id })));

  // hidden state sync so the server action reads current values
  const priceJson = useMemo(() => JSON.stringify(prices.filter((p) => p.name && p.price)), [prices]);
  const barcodeJson = useMemo(
    () => JSON.stringify(barcodes.filter((b) => b.barcode)),
    [barcodes],
  );

  return (
    <>
      <input type="hidden" name="productType" value={type} />
      <input type="hidden" name="pricesJson" value={priceJson} />
      <input type="hidden" name="barcodesJson" value={barcodeJson} />
      <input type="hidden" name="specJson" value={specJson} />
      <input type="hidden" name="categoryId" value={categoryId} />

      {/* Category + Brand — uniform dropdowns */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Category <span className="text-red-500">*</span></label>
        <select
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className={controlClass}
        >
          <option value="">Select category</option>
          {categoryOptions
            .filter((c) => !c.parentId)
            .map((main) => (
              <optgroup key={main.id} label={main.name}>
                <option value={main.id}>{main.name} (main)</option>
                {categoryOptions
                  .filter((c) => c.parentId === main.id)
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {main.name} › {sub.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          {categoryOptions.filter((c) => !c.parentId).length === 0 &&
            categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Brand</label>
        <select name="brandId" defaultValue={defaultBrandId ?? ""} className={controlClass}>
          <option value="">No brand</option>
          {brandOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Category-specific specification fields */}
      {specFields.length > 0 && (
        <div className="sm:col-span-2 rounded-lg border border-dashed border-[var(--brand)]/40 p-4">
          <p className="mb-2 text-sm font-medium">{selectedCategory?.name} specifications</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {specFields.map((f) => (
              <div key={f.key}>
                <label className="mb-1.5 block text-sm font-medium">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                  {f.status === "disabled" && <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">(disabled)</span>}
                </label>
                {f.type === "select" ? (
                  <select
                    value={specValues[f.key] ?? ""}
                    onChange={(e) => updateSpec(f.key, e.target.value)}
                    required={f.required && f.status === "active"}
                    disabled={f.status === "disabled"}
                    className={`${controlClass} disabled:opacity-60`}
                  >
                    <option value="">Select…</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    value={specValues[f.key] ?? ""}
                    onChange={(e) => updateSpec(f.key, e.target.value)}
                    required={f.required && f.status === "active"}
                    disabled={f.status === "disabled"}
                    className={`${controlClass} disabled:opacity-60`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type selector (segmented) */}
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium">Product type</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <button
              type="button"
              key={val}
              onClick={() => setType(val)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                type === val
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                  : "border-[var(--background)] hover:bg-[var(--background)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* BASE (shared) pricing */}
      <Field label="Cost price" name="costPrice" type="number" defaultValue={costPrice ?? ""} />
      <Field label="Default selling price" name="sellingPrice" type="number" defaultValue={sellingPrice ?? ""} />

      {/* PRICE TIERS — available for every type */}
      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Price tiers (multiple prices)</label>
          <button
            type="button"
            onClick={() => setPrices((a) => [...a, { id: uid(), name: "", price: "", minQty: "" }])}
            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]"
          >
            + Add tier
          </button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1.4fr_1fr_0.8fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            <span>Tier name</span>
            <span>Price</span>
            <span>Min qty</span>
            <span />
          </div>
          {prices.map((p, i) => (
            <div key={p.id} className="grid grid-cols-[1.4fr_1fr_0.8fr_auto] items-center gap-2">
              <input name={`tier_name_${p.id}`} value={p.name} onChange={(e) => updatePrice(p.id, "name", e.target.value)} placeholder="e.g. Wholesale" className={controlClass} />
              <input name={`tier_price_${p.id}`} value={p.price} onChange={(e) => updatePrice(p.id, "price", e.target.value)} type="number" step="0.01" placeholder="0.00" className={controlClass} />
              <input name={`tier_min_${p.id}`} value={p.minQty} onChange={(e) => updatePrice(p.id, "minQty", e.target.value)} type="number" placeholder="—" className={controlClass} />
              <button
                type="button"
                onClick={() => setPrices((a) => a.filter((x) => x.id !== p.id))}
                disabled={prices.length === 1}
                className="rounded-md border px-2 py-2 text-xs text-red-500 disabled:opacity-40"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* TYPE-SPECIFIC SECTIONS */}
      {type === "BARCODE" && (
        <div className="sm:col-span-2 rounded-lg border border-dashed border-[var(--brand)]/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Barcodes</p>
              <p className="text-xs text-[var(--muted)]">Scan or enter barcodes. Mark one as primary.</p>
            </div>
            <button type="button" onClick={() => setBarcodes((a) => [...a, { id: uid(), barcode: "", format: "CODE128", isPrimary: a.length === 0 }])} className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]">+ Add barcode</button>
          </div>
          <div className="space-y-2">
            {barcodes.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2">
                <input value={b.barcode} onChange={(e) => updateBarcode(b.id, "barcode", e.target.value)} placeholder="Barcode value" className={`${controlClass} flex-1 min-w-[140px]`} />
                <select value={b.format} onChange={(e) => updateBarcode(b.id, "format", e.target.value)} className={controlClass}>
                  <option value="CODE128">CODE128</option>
                  <option value="EAN13">EAN13</option>
                  <option value="UPC">UPC</option>
                  <option value="QR">QR</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="radio" name="primaryBarcode" checked={b.isPrimary} onChange={() => setPrimaryBarcode(b.id)} className="accent-[var(--brand)]" /> Primary
                </label>
                <button type="button" onClick={() => setBarcodes((a) => a.filter((x) => x.id !== b.id))} disabled={barcodes.length === 1} className="rounded-md border px-2 py-2 text-xs text-red-500 disabled:opacity-40">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === "NON_SERIALIZED" && (
        <div className="sm:col-span-2 rounded-lg border border-dashed border-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Bulk stock item — tracked by quantity only. Manage stock levels per location on the product detail page.
        </div>
      )}
    </>
  );
}
