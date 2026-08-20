"use client";

import { useMemo, useState } from "react";
import { Field, controlClass } from "@/components/form";

export type PriceTier = { id: string; name: string; price: string; minQty: string };
export type BarcodeRow = { id: string; barcode: string; format: string; isPrimary: boolean };
export type SerialRow = { id: string; serialNo: string };

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
  initialSerials,
}: {
  productType: string;
  costPrice?: string | null;
  sellingPrice?: string | null;
  initialPrices?: PriceTier[];
  initialBarcodes?: BarcodeRow[];
  initialSerials?: SerialRow[];
}) {
  const [type, setType] = useState<string>(productType || "NON_SERIALIZED");
  const [prices, setPrices] = useState<PriceTier[]>(
    initialPrices && initialPrices.length ? initialPrices : [{ id: uid(), name: "Default", price: "", minQty: "" }],
  );
  const [barcodes, setBarcodes] = useState<BarcodeRow[]>(
    initialBarcodes && initialBarcodes.length ? initialBarcodes : [{ id: uid(), barcode: "", format: "CODE128", isPrimary: true }],
  );
  const [serials, setSerials] = useState<SerialRow[]>(
    initialSerials && initialSerials.length ? initialSerials : [{ id: uid(), serialNo: "" }],
  );

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
  const updateSerial = (id: string, val: string) =>
    setSerials((arr) => arr.map((s) => (s.id === id ? { ...s, serialNo: val } : s)));

  // hidden state sync so the server action reads current values
  const priceJson = useMemo(() => JSON.stringify(prices.filter((p) => p.name && p.price)), [prices]);
  const barcodeJson = useMemo(
    () => JSON.stringify(barcodes.filter((b) => b.barcode)),
    [barcodes],
  );
  const serialJson = useMemo(
    () => JSON.stringify(serials.filter((s) => s.serialNo)),
    [serials],
  );

  return (
    <>
      <input type="hidden" name="productType" value={type} />
      <input type="hidden" name="pricesJson" value={priceJson} />
      <input type="hidden" name="barcodesJson" value={barcodeJson} />
      <input type="hidden" name="serialsJson" value={serialJson} />

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
      {type === "SERIALIZED" && (
        <div className="sm:col-span-2 rounded-lg border border-dashed border-[var(--brand)]/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Serial numbers</p>
              <p className="text-xs text-[var(--muted)]">Track each unit individually. One serial per line/item.</p>
            </div>
            <button type="button" onClick={() => setSerials((a) => [...a, { id: uid(), serialNo: "" }])} className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]">+ Add serial</button>
          </div>
          <div className="space-y-2">
            {serials.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <input value={s.serialNo} onChange={(e) => updateSerial(s.id, e.target.value)} placeholder="Serial number" className={controlClass} />
                <button type="button" onClick={() => setSerials((a) => a.filter((x) => x.id !== s.id))} disabled={serials.length === 1} className="rounded-md border px-2 py-2 text-xs text-red-500 disabled:opacity-40">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

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
